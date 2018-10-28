'use strict'

const bs58 = require('bs58')

const ops = require('./protobuffers').rpc.RPC.Operation

function unmarshall (message) {
  // TODO improve code unmarshalling
  const result = {}
  result.metadata = message.metadata

  if (message.topicId) {
    result.topicId = bs58.encode(message.topicId)
  }

  if (message.topic) {
    result.topic = {
      author: bs58.encode(message.topic.author),
      parent: bs58.encode(message.topic.parent),
      ...message.topic
    }
  }

  if (message.event) {
    result.event = {
      topic: bs58.encode(message.event.topic),
      publisher: bs58.encode(message.event.publisher),
      payload: JSON.stringify(message.event.payload.toString('utf8')),
      parent: bs58.encode(message.event.parent),
      ...message.event
    }
  }

  if (message.peerTree) {
    result.peerTree = {
      parents: message.peerTree.parents.map(parent => bs58.encode(parent)),
      children: message.peerTree.children.map(child => bs58.encode(child)),
      topic: bs58.encode(message.peerTree.topic)
    }
  }

  // Convert OP to a valid uppercase string
  result.op = Object.entries(ops).find(([op, value]) => {
    return value === message.op
  })[0]

  return result
}

function marshall (message) {
  // TODO improve code marshalling
  const result = {}
  result.metadata = message.metadata

  if (message.topicId) {
    result.topicId = bs58.decode(message.topicId)
  }

  if (message.topic) {
    result.topic = {
      author: bs58.decode(message.topic.author),
      parent: bs58.decode(message.topic.parent),
      ...message.topic
    }
  }

  if (message.event) {
    result.event = {
      publisher: bs58.decode(message.event.publisher),
      payload: Buffer.from(JSON.stringify(message.event.payload), 'utf8'),
      parent: bs58.decode(message.event.parent),
      metadata: message.event.metadata
    }
  }

  if (message.peerTree) {
    result.peerTree = {
      parents: message.peerTree.parents.map(parent => bs58.decode(parent)),
      children: message.peerTree.children.map(child => bs58.decode(child)),
      topic: bs58.decode(message.peerTree.topic)
    }
  }

  // Convert OP string to a valid int
  result.op = Object.entries(ops).find(([op, value]) => {
    return op === message.op
  })[1]

  return result
}

module.exports = {
  unmarshall,
  marshall
}
