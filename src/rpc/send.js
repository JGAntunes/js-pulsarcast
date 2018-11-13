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

  function event (topicB58Str, event, fromIdB58Str) {
    const neighbours = pulsarcastNode.me.trees.get(topicB58Str)
    // TODO handle publishing to an event we're not subscribed to
    // TODO get topic
    if (!neighbours) return
    const { parents, children } = neighbours
    const rpc = createRPC.event(topicB58Str, event)
    log.debug(rpc)
    log.debug(rpc.event.topic['/'])
    // RPC message is being created at this node, not just forwardind,
    // so add it to DHT and propagate it through our whole topic tree
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

      parents.forEach(parent => send(parent, rpc))
      children.forEach(child => send(child, rpc))
      return
    }

    // Need to check where to forward the message
    if (parents.find(peer => peer.info.id.toB58String() === fromIdB58Str)) {
      // Need to forward the message to our children
      children.forEach(children => send(children, rpc))
    }

    if (children.find(peer => peer.info.id.toB58String() === fromIdB58Str)) {
      // Need to forward the message to our parents
      parents.forEach(parent => send(parent, rpc))
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

    pulsarcastNode._getPeer(closestPeerId, (err, peer) => {
      // TODO proper error handling
      if (err) throw err
      // Add peer to my tree
      pulsarcastNode.me.addParents(rpc.topicId.toBaseEncodedString(), [peer])

      send(peer, rpc)
    })
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

  function send (peer, rpc) {
    log.trace(`Sending ${rpc.op} to ${peer.info.id.toB58String()}`)

    const rpcToSend = marshalling.marshall(rpc)
    const encodedMessage = RPC.encode({msgs: [rpcToSend]})

    peer.sendMessages(encodedMessage)
  }
}

module.exports = createRPCHandlers
