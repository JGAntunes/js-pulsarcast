'use strict'

// HACK should be exposed by the main class
const { convertPeerId } = require('libp2p-kad-dht/src/utils')

function closestPeerToPeer (dht, peerId, cb) {
  convertPeerId(peerId, (err, key) => {
    if (err) cb(err)
    cb(null, dht.routingTable.closestPeer(key))
  })
}

module.exports = {
  closestPeerToPeer
}
