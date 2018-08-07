'use strict'

const Joi = require('joi-browser')
const bs58 = require('bs58')

const log = require('../utils/logger')
const ops = require('../messages').rpc.RPC.Operation
const schemas = require('../messages').schemas

function unmarshallMessage (message) {
  // TODO improve code unmarshalling
  const result = {}
  result.topic = bs58.encode(message.topic)
  result.metadata = message.metadata

  if (message.event) {
    result.event = {
      publisher: bs58.encode(message.event.publisher),
      payload: JSON.stringify(message.event.payload.toString('utf8')),
      parent: bs58.encode(message.event.parent),
      metadata: message.event.metadata
    }
    // Convert OP to a valid uppercase string
    result.op = Object.entries(ops).find(([op, value]) => {
      return value === message.op
    })[0]
  }

  if (message.peerTree) {
    result.peerTree = {
      parents: message.peerTree.parents.map(parent => bs58.encode(parent)),
      children: message.peerTree.children.map(child => bs58.encode(child))
    }
  }
  return result
}

function createRPCHandlers (pulsarcastNode) {
  return {
    event,
    update,
    join,
    leave,
    genericHandler
  }

  function event (idB58Str, message) {
    log.trace(`Got event from  ${idB58Str}`)

    const {subscriptions} = pulsarcastNode
    // We're subscribed to this topic, emit the message
    if (subscriptions.has(message.topic)) {
      pulsarcastNode.emit(message.topic, message.event)
    }

    // TODO forward event
    pulsarcastNode.rpc.send.event()
  }

  function update (idB58Str, message) {
    log.trace(`Got update from  ${idB58Str}`)

    // Only consider the message if we have data
    if (!message.peerTree) return

    const {peers} = pulsarcastNode
    peers.get(idB58Str).updateTree(message.topic, message.peerTree)
  }

  function join (idB58Str, message) {
    log.trace(`Got update from  ${idB58Str}`)

    const {me, peers} = pulsarcastNode
    // The peer should already be in the list given that
    // we received a message from it
    const child = peers.get(idB58Str)
    me.addChildren(message.topic, [child])
    // Check if you have a set of parents for this topic
    if (me.tree.get(message.topic).parents > 0) {
      // Peer already connected
      // TODO take care of delivering initial state
      return
    }
    // TODO send join
    pulsarcastNode.rpc.send.join()
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
    const jsonMessage = unmarshallMessage(result.message)

    switch (jsonMessage.op) {
      // case ops.PING:
      //   return ping(idB58Str, jsonMessage)
      case ops.UPDATE:
        return update(idB58Str, jsonMessage)
      case ops.EVENT:
        return event(idB58Str, jsonMessage)
      case ops.JOIN:
        return join(idB58Str, jsonMessage)
      case ops.LEAVE:
        return leave(idB58Str, jsonMessage)
    }
  }
}

module.exports = createRPCHandlers
