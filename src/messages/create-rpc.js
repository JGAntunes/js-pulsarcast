'use strict'

const CID = require('cids')

const config = require('../config')

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

function publish (eventNode) {
  return {
    op: 'PUBLISH_EVENT',
    metadata: createMetadata(),
    event: eventNode
  }
}

function requestToPublish (eventNode) {
  return {
    op: 'REQUEST_TO_PUBLISH',
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

function newTopic (topicNode) {
  return {
    op: 'NEW_TOPIC',
    topic: topicNode,
    metadata: createMetadata()
  }
}

function createMetadata () {
  const now = new Date()
  return {
    protocolVersion: config.protocol,
    created: now.toISOString()
  }
}

// TODO perform response validation
module.exports = {
  update,
  event: {
    publish,
    requestToPublish
  },
  topic: {
    join: joinTopic,
    leave: leaveTopic,
    new: newTopic
  }
}
