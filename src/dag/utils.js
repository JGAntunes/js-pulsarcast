'use strict'

const CID = require('cids')

function linkMarshalling(link) {
  // No link
  if (!link) return {}
  // It's a CID already
  if (CID.isCID(link)) return { '/': link.buffer }
  // It's an object but empty
  if (!link['/'] && typeof link === 'object') return {}
  // It can be a link already or just the multihash
  const newCID = new CID(link['/'] || link)
  return { '/': newCID.buffer }
}

function linkUnmarshalling(link) {
  // Link is already a CID
  // happens when dagcbor utils is used directly
  if (CID.isCID(link)) return link

  return link['/'] ? new CID(link['/']) : {}
}

module.exports = {
  linkUnmarshalling,
  linkMarshalling
}
