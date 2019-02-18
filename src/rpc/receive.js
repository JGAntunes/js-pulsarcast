'use strict'

const Joi = require('joi')
const { waterfall } = require('async')

const TopicNode = require('../dag/topic-node')
const log = require('../utils/logger')
const { protobuffers, schemas, marshalling } = require('../messages')

const ops = protobuffers.RPC.Operation

function createRPCHandlers (pulsarcastNode) {
  const dht = pulsarcastNode.libp2p._dht

  return {
    update,
    topic: {
      join,
      leave
    },
    event: {
      publish,
      requestToPublish
    },
    genericHandler
  }

  function publish (idB58Str, eventNode, callback) {
    // Only consider the message if we have data
    if (!eventNode) return callback()
    const {me} = pulsarcastNode
    const myId = me.info.id

    // Publish is from this node so it's a new event
    const newEvent = myId.toB58String() === idB58Str
    log.trace('Got publish %j', eventNode)

    getTopicNode(eventNode.topicCID, (err, topicNode) => {
      if (err) return callback(err)

      const {
        allowedPublishers
      } = topicNode.metadata

      // New event published at this node and not allowed to publish
      if (newEvent && allowedPublishers && !allowedPublishers.find((peer) => peer.isEqual(myId))) {
        return requestToPublish(myId.toB58String(), eventNode, callback)
      }

      // TODO check publisher is allowed

      const options = { isNewEvent: newEvent }
      pulsarcastNode.rpc.send.event.publish(topicNode, eventNode, idB58Str, options, callback)
    })
  }

  function requestToPublish (idB58Str, eventNode, callback) {
    // Only consider the message if we have data
    if (!eventNode) return
    const {me} = pulsarcastNode
    const myId = me.info.id

    log.trace('Got request to publish  %j', eventNode)

    getTopicNode(eventNode.topicCID, (err, topicNode) => {
      if (err) return callback(err)

      const {
        allowedPublishers,
        requestToPublish
      } = topicNode.metadata

      // TODO better handling for this case
      if (!requestToPublish) return callback(null, topicNode, eventNode)
      // TODO better handling for this case
      if (Array.isArray(requestToPublish) && !requestToPublish.find((peer) => peer.isEqual(topicNode.author))) return callback(null, topicNode, eventNode)

      // Publish if I'm allowed to
      if (!allowedPublishers || allowedPublishers.find((peer) => peer.isEqual(myId))) {
        return pulsarcastNode.rpc.send.event.publish(topicNode, eventNode, myId.toB58String(), {isNewEvent: true}, callback)
      }
      // Propagate request to publish
      pulsarcastNode.rpc.send.event.requestToPublish(topicNode, eventNode, idB58Str, callback)
    })
  }

  function update (idB58Str, peerTree) {
    // Only consider the emessage if we have data
    if (!peerTree) return
    const topicCID = peerTree.topicId.toBaseEncodedString()

    log.trace('Got update  %j', peerTree)

    const {peers} = pulsarcastNode
    peers.get(idB58Str).updateTree(topicCID, peerTree)
  }

  function join (idB58Str, topicCID, callback) {
    const {me, peers} = pulsarcastNode
    const topicB58Str = topicCID.toBaseEncodedString()

    // The peer should already be in the list given that
    // we received a message from it
    const child = peers.get(idB58Str)

    log.trace('Got join  %j', topicCID)

    getTopicNode(topicCID, (err, topicNode) => {
      if (err) return callback(err)
      // The join command did not originate at this node
      if (idB58Str !== me.info.id.toB58String()) {
        // Add this peer as a child to this topic tree
        me.addChildren(topicB58Str, [child])
        // TODO take care of delivering initial state
        // This node is the root node for the topic
        if (me.info.id.isEqual(topicNode.author)) return callback(null, topicNode)
        // Check if we have a set of parents for this topic
        if (me.trees.get(topicB58Str).parents > 0) return callback(null, topicNode)
      }

      pulsarcastNode.rpc.send.topic.join(topicNode, callback)
    })
  }

  function leave (idB58Str, message) {
    // TODO leave logic
  }

  function genericHandler (idB58Str, message) {
    const result = Joi.validate(message, schemas.rpc, {
      abortEarly: true,
      allowUnknown: false,
      convert: true
    })
    if (result.error) {
      log.err(`Validation of message from ${idB58Str} failed: ${result.error}`)
      return
    }
    // We use the resulting message from the validation
    // with type coercion
    const jsonMessage = marshalling.unmarshall(result.value)

    log.trace('Received rpc %j', {handler: 'in', op: jsonMessage.op, from: idB58Str})
    const errorHandler = (err) => {
      if (err) log.error('%j', err)
    }

    switch (ops[jsonMessage.op]) {
      // case ops.PING:
      //   return ping(idB58Str, jsonMessage)
      case ops.UPDATE:
        return update(idB58Str, jsonMessage.peerTree)
      case ops.PUBLISH_EVENT:
        return publish(idB58Str, jsonMessage.event, errorHandler)
      case ops.REQUEST_TO_PUBLISH:
        return requestToPublish(idB58Str, jsonMessage.event, errorHandler)
      case ops.JOIN_TOPIC:
        return join(idB58Str, jsonMessage.topicId, errorHandler)
      case ops.LEAVE_TOPIC:
        return leave(idB58Str, jsonMessage, errorHandler)
    }
  }

  // Helper funcs
  function getTopicNode (topicCID, cb) {
    waterfall([
      dht.get.bind(dht, topicCID.buffer, null),
      TopicNode.deserializeCBOR
    ], cb)
  }
}

module.exports = createRPCHandlers
