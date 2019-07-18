'use strict'

const { waterfall } = require('async')

const EventTree = require('../dag/event-tree')
const { createRPC, marshalling, protobuffers } = require('../messages')
const log = require('../utils/logger')
const { closestPeerToPeer, store } = require('../utils/dht-helpers')

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

  function publish (topicNode, eventNode, fromIdB58Str, options, callback) {
    if (!callback) {
      callback = options
      options = {}
    }

    const {me} = pulsarcastNode
    const myId = me.info.id
    const isNewEvent = options.isNewEvent

    if (isNewEvent) {
      // Set the publisher
      eventNode.publisher = myId
    }

    waterfall([
      topicNode.getCID.bind(topicNode),
      (topicCID, cb) => {
        addEvent(topicCID, topicNode, eventNode, {createLink: isNewEvent}, cb)
      },
      (linkedEvent, cb) => {
        if (!isNewEvent) return cb(null, null, linkedEvent)

        // Publish is being created at this node, not just forwardind,
        // so add it to DHT and propagate it through our whole topic tree
        store(dht, linkedEvent, cb)
      }
    ], (err, eventCID, linkedEvent) => {
      if (err) return callback(err)

      const topicB58Str = linkedEvent.topicCID.toBaseEncodedString()
      const rpc = createRPC.event.publish(linkedEvent)
      const trees = pulsarcastNode.me.trees.get(topicB58Str)

      // We're subscribed to this topic, emit the message
      if (pulsarcastNode.subscriptions.has(topicB58Str)) {
        pulsarcastNode.emit(topicB58Str, linkedEvent)
      }
      // TODO handle publishing to an event we're not subscribed to
      if (!trees) return callback(null, eventCID, topicNode, linkedEvent)
      const { parents, children } = trees

      const peers = [...parents, ...children]
      peers.forEach(peer => {
        // Don't forward the message back
        if (peer.info.id.toB58String() !== fromIdB58Str) send(peer, rpc)
        return callback(null, eventCID, topicNode, linkedEvent)
      })
    })
  }

  function requestToPublish (topicNode, eventNode, fromIdB58Str, callback) {
    const rpc = createRPC.event.requestToPublish(eventNode)

    topicNode.getCID((err, topicCID) => {
      if (err) return callback(err)

      const topicB58Str = topicCID.toBaseEncodedString()
      const trees = pulsarcastNode.me.trees.get(topicB58Str)
      // TODO handle request to an event we're not subscribed to
      if (!trees) return callback(null, topicNode, eventNode)
      const { parents, children } = trees

      const peers = [...parents, ...children]
      peers.forEach(peer => {
        // Don't forward the message back
        if (peer.info.id.toB58String() !== fromIdB58Str) send(peer, rpc)
        return callback(null, topicNode, eventNode)
      })
    })
  }

  // Join finds the closest peer to the topic CID
  // and sends the rpc join message
  function joinTopic (topicNode, callback) {
    topicNode.getCID((err, topicCID) => {
      if (err) return callback(err)

      const rpc = createRPC.topic.join(topicCID)
      // Get the closest peer to the topic author stored locally
      waterfall([
        closestPeerToPeer.bind(null, dht, topicNode.author),
        pulsarcastNode._getPeer.bind(pulsarcastNode)
      ], (err, peer) => {
        if (err) return callback(err)
        // Add peer to my tree
        pulsarcastNode.me.addParents(topicCID.toBaseEncodedString(), [peer])
        send(peer, rpc)

        callback(null, topicNode)
      })
    })
  }

  function leaveTopic (topicNode, toPeer, callback) {
    topicNode.getCID((err, topicCID) => {
      if (err) return callback(err)

      const rpc = createRPC.topic.leave(topicCID)
      send(toPeer, rpc)
      callback()
    })
  }

  // TODO for now only store topic descriptor
  function newTopic (topicNode, options, callback) {
    // check if options exist
    if (!callback) {
      callback = options
      options = {}
    }

    store(dht, topicNode, callback)
  }

  function send (peer, rpc) {
    log.trace('Sending rpc %j', {handler: 'out', op: rpc.op, to: peer.info.id.toB58String()})

    const rpcToSend = marshalling.marshall(rpc)
    const encodedMessage = RPC.encode({msgs: [rpcToSend]})

    peer.sendMessages(encodedMessage)
  }

  // Helper funcs
  function addEvent (topicCID, topicNode, eventNode, {createLink}, cb) {
    const topicB58Str = topicCID.toBaseEncodedString()
    const {eventTrees} = pulsarcastNode
    let eventTree

    // Add event tree if it does not exist
    if (eventTrees.has(topicB58Str)) {
      eventTree = eventTrees.get(topicB58Str)
    } else {
      eventTree = new EventTree(topicNode)
      eventTrees.set(topicB58Str, eventTree)
    }

    if (createLink) return eventTree.addNew(eventNode, cb)
    eventTree.add(eventNode, cb)
  }

  // function getEvent (topicCID, eventCID) {
  //   const topicB58Str = topicCID.toBaseEncodedString()
  //   const {eventTrees} = pulsarcastNode
  //   const eventTree = eventTrees.get(topicB58Str)
  //   return eventTree.get(eventCID)
  // }
}

module.exports = createRPCHandlers
