'use strict'

const { parallel, waterfall } = require('async')
// HACK should be exposed by the main class
const { convertPeerId } = require('libp2p-kad-dht/src/utils')

const log = require('./logger')

function closestPeerToPeer (dht, peerId, cb) {
  convertPeerId(peerId, (err, key) => {
    if (err) cb(err)
    cb(null, dht.routingTable.closestPeer(key))
  })
}

// Store a event node or topic node
function store (dht, dagNode, cb) {
  waterfall([
    (done) => parallel([
      dagNode.getCID.bind(dagNode),
      dagNode.serializeCBOR.bind(dagNode)
    ], done),
    ([cid, serialized], done) => {
      log.trace('Storing node %j', {
        cid: cid.toBaseEncodedString(),
        ...dagNode.getReadableFormat()
      })
      dht.put(cid.buffer, serialized, (err) => done(err, cid))
    }
  ], (err, cid) => cb(err, cid, dagNode))
}

module.exports = {
  closestPeerToPeer,
  store
}
