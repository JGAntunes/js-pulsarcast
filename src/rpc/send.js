'use strict'

const bs58 = require('bs58')

const log = require('../utils/logger')
const ops = require('../messages').rpc.RPC.Operation

function marshallMessage (message) {
  // TODO improve code marshalling
  const result = {}
  result.topic = bs58.decode(message.topic)
  result.metadata = message.metadata

  if (message.event) {
    result.event = {
      publisher: bs58.decode(message.event.publisher),
      payload: Buffer.from(JSON.stringify(message.event.payload), 'utf8'),
      parent: bs58.decode(message.event.parent),
      metadata: message.event.metadata
    }
    // Convert OP string to a valid int
    result.op = Object.entries(ops).find(([op, value]) => {
      return op === message.op
    })[1]
  }

  if (message.peerTree) {
    result.peerTree = {
      parents: message.peerTree.parents.map(parent => bs58.decode(parent)),
      children: message.peerTree.children.map(child => bs58.decode(child))
    }
  }
  return result
}

function createRPCHandlers (pulsarcastNode) {
  return {
    event,
    update,
    join,
    leave
  }

  function event (message) {
    log.trace(`Sending event to  ${idB58Str}`)
  }

  function update (message) {
    log.trace(`Sending update to  ${idB58Str}`)
  }

  function join (message) {
    log.trace(`Sending join to  ${idB58Str}`)
  }

  function leave (message) {
    log.trace(`Sending leave to  ${idB58Str}`)
  }
}

module.exports = createRPCHandlers
