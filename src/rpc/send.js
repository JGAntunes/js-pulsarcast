'use strict'

const dagCBOR = require('ipld-dag-cbor')
const { parallel, waterfall } = require('async')

const { createRPC, marshalling, protobuffers } = require('../messages')
const log = require('../utils/logger')

const RPC = protobuffers.RPC

function createRPCHandlers (pulsarcastNode) {
  const dht = pulsarcastNode.libp2p._dht

  return {
    event: {
      publish,
      requestToPublish
    },
    topic: {
      join: joinTopic,
      leave: leaveTopic,
      new: newTopic
    }
  }

  function publish (topicNode, eventNode, fromIdB58Str, { store } = {}) {
    const {me} = pulsarcastNode
    const meB58Str = me.info.id.toB58String()

    topicNode.getCID((err, topicCID) => {
      // TODO handle error
      if (err) {
        log.error('%j', err)
      }

      const topicB58Str = topicCID.toBaseEncodedString()
      // Set the publisher
      eventNode.publisher = meB58Str
      const rpc = createRPC.event.publish(eventNode)
      // RPC message is being created at this node, not just forwardind,
      // so add it to DHT and propagate it through our whole topic tree
      if (store) {
        waterfall([
          (cb) => parallel([
            eventNode.getCID.bind(eventNode),
            eventNode.serializeCBOR.bind(eventNode)
          ], cb),
          ([cid, serialized], cb) => {
            log.trace('Storing event %j', {cid: cid.toBaseEncodedString()})
            dht.put(cid.buffer, serialized, cb)
          }
        ], (err) => {
          // TODO handle error
          if (err) {
            log.error('%j', err)
          }
        })
      }

      const trees = pulsarcastNode.me.trees.get(topicB58Str)
      // TODO handle publishing to an event we're not subscribed to
      if (!trees) return
      const { parents, children } = trees

      const peers = [...parents, ...children]
      peers.forEach(peer => {
        // Don't forward the message back
        if (peer.info.id.toB58String() === fromIdB58Str) return
        send(peer, rpc)
      })
    })
  }

  function requestToPublish (topicB58Str, eventNode, fromIdB58Str) {
    const rpc = createRPC.event.requestToPublish(eventNode)

    const trees = pulsarcastNode.me.trees.get(topicB58Str)
    // TODO handle request to an event we're not subscribed to
    if (!trees) return
    const { parents, children } = trees

    const peers = [...parents, ...children]
    peers.forEach(peer => {
      // Don't forward the message back
      if (peer.info.id.toB58String() === fromIdB58Str) return
      send(peer, rpc)
    })
  }

  // Join finds the closest peer to the topic CID
  // and sends the rpc join message
  function joinTopic (topic) {
    // TODO NEXT move this to receivw
    const rpc = createRPC.topic.join(topic)

    waterfall([
      // Get the actual topic descriptor
      dht.get.bind(dht, rpc.topicId.buffer, null),
      dagCBOR.util.deserialize,
      (topic, cb) => {
        // Get the closest peer to the topic stored locally
        const closestPeerId = dht.routingTable.closestPeer(rpc.topicId.buffer, 1)
        pulsarcastNode._getPeer(closestPeerId, cb)
      }
    ], (err, peer) => {
      // TODO handle error
      if (err) {
        log.error('%j', err)
        throw err
      }

      // Add peer to my tree
      pulsarcastNode.me.addParents(rpc.topicId.toBaseEncodedString(), [peer])
      send(peer, rpc)
    })
  }

  function leaveTopic (topic) {
    // TODO
  }

  // TODO for now only put topic descriptor
  function newTopic (topicNode, options) {
    // const rpc = createRPC.topic.new(topicNode)

    waterfall([
      (cb) => parallel([
        topicNode.getCID.bind(topicNode),
        topicNode.serializeCBOR.bind(topicNode)
      ], cb),
      ([cid, serialized], cb) => {
        log.trace('Topic created %j', {name: topicNode.name, cid: cid.toBaseEncodedString()})
        dht.put(cid.buffer, serialized, cb)
      }
    ], (err) => {
      // TODO proper error handling
      if (err) {
        log.error('%j', err)
      }
      log.trace('Topic stored %j', {name: topicNode.name})
    })
  }

  function send (peer, rpc) {
    log.trace('Sending rpc %j', {handler: 'out', op: rpc.op, to: peer.info.id.toB58String()})

    const rpcToSend = marshalling.marshall(rpc)
    const encodedMessage = RPC.encode({msgs: [rpcToSend]})

    peer.sendMessages(encodedMessage)
  }
}

module.exports = createRPCHandlers
