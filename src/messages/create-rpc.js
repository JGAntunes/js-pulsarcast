'use strict'

const config = require('../config')
const ops = require('./protobuffers').RPC.Operation

function createMetadata () {
  const now = new Date()
  return {
    protocolVersion: config.protocol,
    created: now.toISOString()
  }
}

// Update RPC message will handle neighbourhood
// updates
function update (topic, {parents, children}) {
  const metadata = createMetadata()
  return {
    op: ops.UPDATE,
    metadata,
    peerTree: {
      topic,
      parents,
      children
    }
  }
}

function event (topic, {publisher, parent, payload, metadata = createMetadata()}) {
  return {
    op: ops.EVENT,
    metadata,
    event: {
      topic,
      publisher,
      parent,
      payload,
      metadata
    }
  }
}

function joinTopic (topic) {
  return {
    op: ops.JOIN_TOPIC,
    topicId: topic,
    metadata: createMetadata()
  }
}

function leaveTopic (topic) {
  return {
    op: ops.LEAVE_TOPIC,
    topicId: topic,
    metadata: createMetadata()
  }
}

function newTopic (name, {author, parent, metadata = createMetadata()}) {
  return {
    op: ops.NEW_TOPIC,
    topic: {
      name,
      author,
      parent,
      '#': {},
      metadata
    },
    metadata
  }
}

// TODO perform response validation
module.exports = {
  update,
  event,
  topic: {
    join: joinTopic,
    leave: leaveTopic,
    new: newTopic
  }
}
