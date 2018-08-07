'use strict'

const Joi = require('joi-browser')
const bs58 = require('bs58')
const log = require('../utils/logger')

// const log = require('utils/logger')
const ops = require('../messages').rpc.RPC.Operation
const schemas = require('../messages').schemas

function unmarshallMessage (message) {
  const result = {}
  result.topic = bs58.encode(message.topic)
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
  }

  function update (idB58Str, message) {
    log.trace(`Got update from  ${idB58Str}`)
  }

  function join (idB58Str, message) {
    log.trace(`Got update from  ${idB58Str}`)
    // TODO perform join validation here
    // const topic = message.topic
  }

  function leave (idB58Str, message) {
    log.trace(`Got leave from  ${idB58Str}`)
  }

  function genericHandler (idB58Str, message) {
    const result = Joi.validate(message, schemas.rpc, {
      abortEarly: true,
      allowUnknown: false,
      convert: true
    })

    if (result.error) {
      // TODO log error
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
