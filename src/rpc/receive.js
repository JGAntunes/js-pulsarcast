'use strict'

const Joi = require('joi-browser')

const log = require('../utils/logger')
const { protobuffers, schemas, marshalling } = require('../messages')

const ops = protobuffers.RPC.Operation

function createRPCHandlers (pulsarcastNode) {
  return {
    event,
    update,
    topic: {
      join,
      leave
    },
    genericHandler
  }

  function event (idB58Str, message) {
    log.trace(`Got event from  ${idB58Str}`)

    // Only consider the message if we have data
    if (!message.event) return

    const {subscriptions} = pulsarcastNode
    const topicCID = message.event.topic['/'].toBaseEncodedString()
    // We're subscribed to this topic, emit the message
    if (subscriptions.has(topicCID)) {
      pulsarcastNode.emit(topicCID, message.event)
    }

    pulsarcastNode.rpc.send.event(topicCID, message.event, idB58Str)
  }

  function update (idB58Str, message) {
    log.trace(`Got update from  ${idB58Str}`)

    // Only consider the message if we have data
    if (!message.peerTree) return
    const topicCID = message.peerTree.topicId.toBaseEncodedString()

    const {peers} = pulsarcastNode
    peers.get(idB58Str).updateTree(topicCID, message.peerTree)
  }

  function join (idB58Str, message) {
    log.trace(`Got join from  ${idB58Str}`)

    const {me, peers} = pulsarcastNode
    const topicCID = message.topicId.toBaseEncodedString()

    // The peer should already be in the list given that
    // we received a message from it
    const child = peers.get(idB58Str)
    // TODO get the actual topic from the DHT
    me.addChildren(topicCID, [child])
    // Check if you have a set of parents for this topic
    if (me.tree.get(topicCID).parents > 0) {
      // Peer already connected
      // TODO take care of delivering initial state
      return
    }

    pulsarcastNode.rpc.send.join(topicCID)
  }

  function leave (idB58Str, message) {
    log.trace(`Got leave from  ${idB58Str}`)
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
    const jsonMessage = marshalling.unmarshall(result.message)

    switch (jsonMessage.op) {
      // case ops.PING:
      //   return ping(idB58Str, jsonMessage)
      case ops.UPDATE:
        return update(idB58Str, jsonMessage)
      case ops.EVENT:
        return event(idB58Str, jsonMessage)
      case ops.JOIN_TOPIC:
        return join(idB58Str, jsonMessage)
      case ops.LEAVE_TOPIC:
        return leave(idB58Str, jsonMessage)
    }
  }
}

module.exports = createRPCHandlers
