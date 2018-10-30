'use strict'

const dagCBOR = require('ipld-dag-cbor')

const { createRPC, marshalling } = require('../messages')
const log = require('../utils/logger')
const { protobuffers } = require('./messages')
const RPC = protobuffers.RPC

function createRPCHandlers (pulsarcastNode) {
  const dht = pulsarcastNode.libp2p.dht

  return {
    event,
    topic: {
      join: joinTopic,
      leave: leaveTopic,
      new: newTopic
    }
  }

  function event (topic, event, fromIdB58Str) {
    const { parents, children } = pulsarcastNode.me.trees.get(topic)
    const rpc = createRPC.event(topic, event)
    // RPC message is being created at this node, not just forwardind,
    // so add it on IPLD and propagate it through our whole topic tree
    if (!fromIdB58Str) {
      dagCBOR.util.cid(rpc.event, (err, cid) => {
        console.log(cid)
        // TODO handle error, callback and all of this
        dagCBOR.util.serialize(rpc.event, (err, serialized) => {
          // TODO handle error
          dht.put(cid.buffer, serialized, (err) => {
            // TODO handle error
          })
        })
      })

      parents.forEach(parent => send(parent.info.id.toB58Str(), rpc))
      children.forEach(child => send(child.info.id.toB58Str(), rpc))
      return
    }

    // Need to check where to forward the message
    if (parents.find(peer => peer.info.id.toB58String() === fromIdB58Str)) {
      // Need to forward the message to our children
      parents.forEach(parent => send(parent.info.id.toB58Str(), rpc))
    }

    if (children.find(peer => peer.info.id.toB58String() === fromIdB58Str)) {
      // Need to forward the message to our parents
      children.forEach(child => send(child.info.id.toB58Str(), rpc))
    }
  }

  // Join finds the closest peer to the topic CID
  // and sends the rpc join message
  function joinTopic (topic) {
    // TODO get the actual topic descriptor
    const rpc = createRPC.topic.join(topic)

    // Get the closest peer stored locally
    const closestPeerId = dht.routingTable.closestPeer(topic, 1)
    send(closestPeerId.toB58Str(), rpc)
  }

  function leaveTopic (topic) {
    // TODO
  }

  // TODO for now only put topic descriptor
  function newTopic (name, options) {
    const rpc = createRPC.topic.new(name, options)

    dagCBOR.util.cid(rpc.topic, (err, cid) => {
      console.log(cid)
      // TODO handle error, callback hell and all of this
      dagCBOR.util.serialize(rpc.topic, (err, serialized) => {
        // TODO handle error
        dht.put(cid.buffer, serialized, (err) => {
          // TODO handle error
        })
      })
    })
  }

  function send (idB58Str, rpc) {
    log.trace(`Sending event to ${idB58Str}`)

    const rpcToSend = marshalling.marshall(rpc)
    const peer = pulsarcastNode.peers.get(idB58Str)
    const encodedMessage = RPC.encode([rpcToSend])
    peer.sendMessages(encodedMessage)
  }
}

module.exports = createRPCHandlers
