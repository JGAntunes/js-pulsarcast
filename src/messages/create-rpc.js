'use strict'

const config = require('../config')
const ops = require('../messages').rpc.RPC.Operation

function createMetadata () {
  const now = new Date()
  return {
    protocolVersion: config.protocol,
    created: now.toISOString()
  }
}

function update (topic, {parents, children}) {
  const metadata = createMetadata()
  return {
    op: ops.UPDATE,
    topic,
    metadata,
    peerTree: {
      parents,
      children
    }
  }
}

function event (topic, {publisher, parent, payload, metadata = createMetadata()}) {
  return {
    op: ops.EVENT,
    topic,
    metadata,
    event: {
      publisher,
      parent,
      payload,
      metadata
    }
  }
}

function join (topic) {
  return {
    op: ops.JOIN,
    topic,
    metadata: createMetadata()
  }
}

function leave (topic) {
  return {
    op: ops.LEAVE,
    topic,
    metadata: createMetadata()
  }
}

// TODO perform response validation
module.exports = {
  update,
  event,
  join,
  leave
}
