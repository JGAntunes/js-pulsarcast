'use strict'

const CID = require('cids')

const config = require('../config')

function createMetadata () {
  const now = new Date()
  return {
    protocolVersion: config.protocol,
    created: now.toISOString()
  }
}

function createLink (bs58Hash) {
  return bs58Hash ? {'/': new CID(bs58Hash)} : {}
}

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

function event (topic, {publisher, parent, payload, metadata = createMetadata()}) {
  return {
    op: 'EVENT',
    metadata,
    event: {
      topic: createLink(topic),
      publisher,
      parent: createLink(parent),
      payload,
      metadata
    }
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
      parent: createLink(parent),
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
