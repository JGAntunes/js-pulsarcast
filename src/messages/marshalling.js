'use strict'

const bs58 = require('bs58')
const CID = require('cids')

const EventNode = require('../dag/event-node')
const TopicNode = require('../dag/topic-node')
const ops = require('./protobuffers').RPC.Operation

function unmarshall (message) {
  // TODO improve code unmarshalling
  const result = {}
  result.metadata = message.metadata

  if (message.topicId) {
    // TODO error handling
    result.topicId = new CID(message.topicId)
  }

  if (message.topic) {
    result.topic = TopicNode.deserialize(message.topic)
  }

  if (message.event) {
    result.event = EventNode.deserialize(message.event)
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
    result.topic = message.topic.serialize()
  }

  if (message.event) {
    result.event = message.event.serialize()
  }

  if (message.peerTree) {
    result.peerTree = {
      parents: message.peerTree.parents.map(parent => bs58.decode(parent)),
      children: message.peerTree.children.map(child => bs58.decode(child)),
      topic: message.peerTree.topic.buffer
    }
  }

  // Convert OP string to a valid int
  result.op = ops[message.op]

  return result
}

module.exports = {
  unmarshall,
  marshall
}
