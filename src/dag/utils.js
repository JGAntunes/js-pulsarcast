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

function linkMarshalling (link) {
  // No link
  if (!link) return {}
  // It's a CID already
  if (CID.isCID(link)) return {'/': link.buffer}
  // It's an object but empty
  if (!link['/'] && typeof link === 'object') return {}
  // It can be a link already or just the multihash
  const newCID = new CID(link['/'] || link)
  return {'/': newCID.buffer}
}

function linkUnmarshalling (link) {
  // TODO error handling
  return link['/'] ? new CID(link['/']) : {}
}

module.exports = {
  linkUnmarshalling,
  linkMarshalling,
  createMetadata
}
