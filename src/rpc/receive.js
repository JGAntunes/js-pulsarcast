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

  function publish (idB58Str, message) {
    // Only consider the message if we have data
    if (!message.event) return
    const {me, subscriptions} = pulsarcastNode
    const topicB58Str = message.event.topicCID.toBaseEncodedString()
    const meB58Str = me.info.id.toB58String()

    log.debug('Got publish %O', message)

    getTopicNode(message.event.topicCID, (err, topicNode) => {
      // TODO handle error
      if (err) {
        log.error('%j', err)
        throw err
      }

      const {
        allowedPublishers,
        requestToPublish
      } = topicNode.metadata

      if (allowedPublishers && !allowedPublishers.includes(meB58Str)) {
        if (requestToPublish) {
          if (!Array.isArray(requestToPublish) || requestToPublish.includes(meB58Str)) {
            // Propagate request to publish
            return pulsarcastNode.rpc.send.event.requestToPublish(topicNode, message.event)
          }
        }
      }
      // We're subscribed to this topic, emit the message
      if (subscriptions.has(topicB58Str)) {
        pulsarcastNode.emit(topicB58Str, message.event)
      }

      const options = {}
      // Publish is from this node so we need to store the event
      if (meB58Str === idB58Str) {
        options.store = true
      }
      pulsarcastNode.rpc.send.event.publish(topicNode, message.event, idB58Str, options)
    })
  }

  function requestToPublish (idB58Str, message) {
    // Only consider the message if we have data
    if (!message.event) return
    const {me} = pulsarcastNode
    const meB58Str = me.info.id.toB58String()

    log.debug('Got request to publish  %O', message)

    getTopicNode(message.event.topicCID, (err, topicNode) => {
      // TODO handle error
      if (err) {
        log.error('%j', err)
        throw err
      }

      const {allowedPublishers} = topicNode.metadata

      // Publish if I'm allowed to
      if (!allowedPublishers || allowedPublishers.includes(meB58Str)) {
        return pulsarcastNode.rpc.send.event.publish(topicNode, message.event, idB58Str, {store: true})
      }

      // Propagate the request
      pulsarcastNode.rpc.send.event.requestToPublish(topicNode, message.event)
    })
  }

  function update (idB58Str, message) {
    // Only consider the message if we have data
    if (!message.peerTree) return
    const topicCID = message.peerTree.topicId.toBaseEncodedString()

    const {peers} = pulsarcastNode
    peers.get(idB58Str).updateTree(topicCID, message.peerTree)
  }

  function join (idB58Str, message) {
    const {me, peers} = pulsarcastNode
    const topicCID = message.topicId.toBaseEncodedString()

    // The peer should already be in the list given that
    // we received a message from it
    const child = peers.get(idB58Str)

    getTopicNode(message.topicId, (err, topicNode) => {
      // TODO handle error
      if (err) {
        log.error('%j', err)
        throw err
      }
      // Add this peer as a child to this topic tree
      me.addChildren(topicCID, [child])
      // TODO take care of delivering initial state
      // This node is the root node for the topic
      if (me.info.id.toB58String() === topicNode.author) return
      // Check if we have a set of parents for this topic
      if (me.trees.get(topicCID).parents > 0) return

      pulsarcastNode.rpc.send.topic.join(topicCID)
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

    switch (ops[jsonMessage.op]) {
      // case ops.PING:
      //   return ping(idB58Str, jsonMessage)
      case ops.UPDATE:
        return update(idB58Str, jsonMessage)
      case ops.PUBLISH_EVENT:
        return publish(idB58Str, jsonMessage)
      case ops.REQUEST_TO_PUBLISH:
        return requestToPublish(idB58Str, jsonMessage)
      case ops.JOIN_TOPIC:
        return join(idB58Str, jsonMessage)
      case ops.LEAVE_TOPIC:
        return leave(idB58Str, jsonMessage)
    }
  }

  // Helper func
  function getTopicNode (topicCID, cb) {
    waterfall([
      dht.get.bind(dht, topicCID.buffer, null),
      TopicNode.deserializeCBOR
    ], cb)
  }
}

module.exports = createRPCHandlers
