'use strict'

const dagCBOR = require('ipld-dag-cbor')
const { parallel, waterfall } = require('async')

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

  function event (topicB58Str, eventNode, fromIdB58Str) {
    const trees = pulsarcastNode.me.trees.get(topicB58Str)
    // TODO handle publishing to an event we're not subscribed to
    // TODO get topic
    if (!trees) return
    const { parents, children } = trees
    // TODO next
    const rpc = createRPC.event(topicB58Str, eventNode)
    // RPC message is being created at this node, not just forwardind,
    // so add it to DHT and propagate it through our whole topic tree
    if (!fromIdB58Str) {
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
