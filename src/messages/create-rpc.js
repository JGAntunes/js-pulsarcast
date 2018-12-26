'use strict'

const CID = require('cids')

const { createMetadata, linkMarshalling } = require('../dag/utils')

// Update RPC message will handle neighbourhood
// updates
function update (topic, {parents, children}) {
  const metadata = createMetadata()
  return {
    op: 'UPDATE',
    metadata,
    peerTree: {
      topic,
      parents,
      children
    }
  }
}

function event (topic, eventNode) {
  return {
    op: 'EVENT',
    metadata: createMetadata(),
    event: eventNode
  }
}

function joinTopic (topic) {
  return {
    op: 'JOIN_TOPIC',
    topicId: new CID(topic),
    metadata: createMetadata()
  }
}

function leaveTopic (topic) {
  return {
    op: 'LEAVE_TOPIC',
    topicId: new CID(topic),
    metadata: createMetadata()
  }
}

function newTopic (name, {author, parent, metadata = createMetadata()}) {
  return {
    op: 'NEW_TOPIC',
    topic: {
      name,
      author,
      parent: linkMarshalling(parent),
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
