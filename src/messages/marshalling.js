'use strict'

const bs58 = require('bs58')
const CID = require('cids')

const ops = require('./protobuffers').RPC.Operation

function linkMarshalling (link) {
  return link['/'] ? {'/': link['/'].buffer} : {}
}

function linkUnmarshalling (link) {
  // TODO error handling
  return link['/'] ? {'/': new CID(link['/'])} : {}
}

function unmarshall (message) {
  // TODO improve code unmarshalling
  const result = {}
  result.metadata = message.metadata

  if (message.topicId) {
    // TODO error handling
    result.topicId = new CID(message.topicId)
  }

  if (message.topic) {
    result.topic = {
      author: linkUnmarshalling(message.topic.author),
      parent: linkUnmarshalling(message.topic.parent),
      ...message.topic
    }
  }

  if (message.event) {
    result.event = {
      topic: linkUnmarshalling(message.event.topic),
      publisher: bs58.encode(message.event.publisher),
      payload: JSON.stringify(message.event.payload.toString('utf8')),
      parent: linkUnmarshalling(message.event.parent),
      ...message.event
    }
  }

  if (message.peerTree) {
    result.peerTree = {
      parents: message.peerTree.parents.map(parent => bs58.encode(parent)),
      children: message.peerTree.children.map(child => bs58.encode(child)),
      topic: new CID(message.peerTree.topic)
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
    result.topicId = message.topicId.buffer
  }

  if (message.topic) {
    result.topic = {
      author: linkMarshalling(message.topic.author),
      parent: linkMarshalling(message.topic.parent),
      ...message.topic
    }
  }

  if (message.event) {
    result.event = {
      topic: linkMarshalling(message.event.topic),
      publisher: bs58.decode(message.event.publisher),
      payload: Buffer.from(JSON.stringify(message.event.payload), 'utf8'),
      parent: linkMarshalling(message.event.parent),
      metadata: message.event.metadata
    }
  }

  if (message.peerTree) {
    result.peerTree = {
      parents: message.peerTree.parents.map(parent => bs58.decode(parent)),
      children: message.peerTree.children.map(child => bs58.decode(child)),
      topic: message.peerTree.topic.buffer
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
