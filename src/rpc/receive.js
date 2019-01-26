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

  function publish (idB58Str, eventNode) {
    // Only consider the message if we have data
    if (!eventNode) return
    const {me, subscriptions} = pulsarcastNode
    const topicB58Str = eventNode.topicCID.toBaseEncodedString()
    const meB58Str = me.info.id.toB58String()

    log.debug('Got publish %O', eventNode)

    getTopicNode(eventNode.topicCID, (err, topicNode) => {
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
            return pulsarcastNode.rpc.send.event.requestToPublish(topicNode, eventNode)
          }
        }
      }
      // We're subscribed to this topic, emit the message
      if (subscriptions.has(topicB58Str)) {
        pulsarcastNode.emit(topicB58Str, eventNode)
      }

      const options = {}
      // Publish is from this node so we need to store the event
      if (meB58Str === idB58Str) {
        options.store = true
      }
      pulsarcastNode.rpc.send.event.publish(topicNode, eventNode, idB58Str, options)
    })
  }

  function requestToPublish (idB58Str, eventNode) {
    // Only consider the message if we have data
    if (!eventNode) return
    const {me} = pulsarcastNode
    const meB58Str = me.info.id.toB58String()

    log.debug('Got request to publish  %O', eventNode)

    getTopicNode(eventNode.topicCID, (err, topicNode) => {
      // TODO handle error
      if (err) {
        log.error('%j', err)
        throw err
      }

      const {allowedPublishers} = topicNode.metadata

      // Publish if I'm allowed to
      if (!allowedPublishers || allowedPublishers.includes(meB58Str)) {
        return pulsarcastNode.rpc.send.event.publish(topicNode, eventNode, idB58Str, {store: true})
      }

      // Propagate the request
      pulsarcastNode.rpc.send.event.requestToPublish(topicNode, eventNode)
    })
  }

  function update (idB58Str, peerTree) {
    // Only consider the emessage if we have data
    if (!peerTree) return
    const topicCID = peerTree.topicId.toBaseEncodedString()

    const {peers} = pulsarcastNode
    peers.get(idB58Str).updateTree(topicCID, peerTree)
  }

  function join (idB58Str, topicCID) {
    const {me, peers} = pulsarcastNode
    const topicB58Str = topicCID.toBaseEncodedString()

    // The peer should already be in the list given that
    // we received a message from it
    const child = peers.get(idB58Str)

    getTopicNode(topicB58Str, (err, topicNode) => {
      // TODO handle error
      if (err) {
        log.error('%j', err)
        throw err
      }
      // Add this peer as a child to this topic tree
      me.addChildren(topicB58Str, [child])
      // TODO take care of delivering initial state
      // This node is the root node for the topic
      if (me.info.id.toB58String() === topicNode.author) return
      // Check if we have a set of parents for this topic
      if (me.trees.get(topicB58Str).parents > 0) return

      pulsarcastNode.rpc.send.topic.join(topicNode)
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
        return update(idB58Str, jsonMessage.peerTree)
      case ops.PUBLISH_EVENT:
        return publish(idB58Str, jsonMessage.event)
      case ops.REQUEST_TO_PUBLISH:
        return requestToPublish(idB58Str, jsonMessage.event)
      case ops.JOIN_TOPIC:
        return join(idB58Str, jsonMessage.topicId)
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
