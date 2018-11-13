'use strict'

const Joi = require('joi')
const dagCBOR = require('ipld-dag-cbor')

const log = require('../utils/logger')
const { protobuffers, schemas, marshalling } = require('../messages')

const ops = protobuffers.RPC.Operation

function createRPCHandlers (pulsarcastNode) {
  const dht = pulsarcastNode.libp2p._dht

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

    log.debug('Message %O', message)
    // Get the topic descriptor from the DHT
    dht.get(message.topicId.buffer, null, (err, value) => {
      // TODO handle error
      if (err) {
        log.error(err)
        throw err
      }
      dagCBOR.util.deserialize(value, (err, node) => {
        // TODO handle error
        if (err) {
          log.error(err)
          throw err
        }
        log.debug(node)
        // TODO NEXT check if author is this node, else bubble up requests
        me.addChildren(topicCID, [child])

        // This node is the root node for the topic
        if (me.info.id.toB58String() === node.author) return

        // Check if you have a set of parents for this topic
        if (me.trees.get(topicCID).parents > 0) {
          // Peer already connected
          // TODO take care of delivering initial state
          return
        }

        pulsarcastNode.rpc.send.join(topicCID)
      })
    })
  }

  function leave (idB58Str, message) {
    log.trace(`Got leave from  ${idB58Str}`)
    // TODO leave logic
  }

  function genericHandler (idB58Str, message) {
    log.debug('%O', message)
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

    log.debug('JSON message %O', jsonMessage)
    switch (ops[jsonMessage.op]) {
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
