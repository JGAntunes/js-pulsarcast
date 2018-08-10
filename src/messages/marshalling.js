'use strict'

const bs58 = require('bs58')

const ops = require('./protobuffers').rpc.RPC.Operation

function unmarshall (message) {
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

function marshall (message) {
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

module.exports = {
  unmarshall,
  marshall
}
