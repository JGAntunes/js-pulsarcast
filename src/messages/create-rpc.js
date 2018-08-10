'use strict'

const config = require('../config')

// TODO NEXT - these messages

function createMetadata () {
  const now = new Date()
  return {
    protocolVersion: config.protocol,
    created: now.toISOString()
  }
}

function update (topic) {
  return {
    topic,
    metadata: createMetadata()
  }
}

function event (topic) {
  return {
    topic,
    metadata: createMetadata()
  }
}

function join (topic) {
  return {
    topic,
    metadata: createMetadata()
  }
}

function leave (topic) {
  return {
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
