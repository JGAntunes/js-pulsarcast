'use strict'

const dagCBOR = require('ipld-dag-cbor')

const { createRPC, marshalling, protobuffers } = require('../messages')
const log = require('../utils/logger')

const RPC = protobuffers.RPC

function createRPCHandlers (pulsarcastNode) {
  const dht = pulsarcastNode.libp2p._dht

  return {
    event,
    topic: {
      join: joinTopic,
      leave: leaveTopic,
      new: newTopic
    }
  }

  function event (topic, event, fromIdB58Str) {
    const neighbours = pulsarcastNode.me.trees.get(topic)
    // TODO handle publishing to an event we're not subscribed to
    if (!neighbours) return
    const { parents, children } = neighbours
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

      parents.forEach(parent => send(parent.info.id, rpc))
      children.forEach(child => send(child.info.id, rpc))
      return
    }

    // Need to check where to forward the message
    if (parents.find(peer => peer.info.id.toB58String() === fromIdB58Str)) {
      // Need to forward the message to our children
      parents.forEach(parent => send(parent.info.id, rpc))
    }

    if (children.find(peer => peer.info.id.toB58String() === fromIdB58Str)) {
      // Need to forward the message to our parents
      children.forEach(child => send(child.info.id, rpc))
    }
  }

  // Join finds the closest peer to the topic CID
  // and sends the rpc join message
  function joinTopic (topic) {
    // TODO get the actual topic descriptor
    const rpc = createRPC.topic.join(topic)

    // Get the closest peer stored locally
    const closestPeerId = dht.routingTable.closestPeer(rpc.topicId.buffer, 1)
    // TODO handle non-existent closestPeer
    if (!closestPeerId) return
    send(closestPeerId, rpc)
  }

  function leaveTopic (topic) {
    // TODO
  }

  // TODO for now only put topic descriptor
  function newTopic (name, options) {
    const rpc = createRPC.topic.new(name, options)

    dagCBOR.util.cid(rpc.topic, (err, cid) => {
      log.trace(`Created new topic with id ${cid.toBaseEncodedString()}`)
      // TODO handle error, callback hell and all of this
      dagCBOR.util.serialize(rpc.topic, (err, serialized) => {
        log.trace(`Topic ${cid.toBaseEncodedString()} serialized`)
        // TODO handle error
        dht.put(cid.buffer, serialized, (err) => {
          log.trace(`Topic ${cid.toBaseEncodedString()} stored in DHT`)
          // TODO handle error
        })
      })
    })
  }

  function send (peerId, rpc) {
    log.trace(`Sending ${rpc.op} to ${peerId.toB58String()}`)

    pulsarcastNode._getPeer(peerId, (err, peer) => {
      // TODO proper error handling
      if (err) throw err

      const rpcToSend = marshalling.marshall(rpc)
      const encodedMessage = RPC.encode({msgs: [rpcToSend]})

      peer.sendMessages(encodedMessage)
    })
  }
}

module.exports = createRPCHandlers
