'use strict'

const { parallel, waterfall } = require('async')
// HACK should be exposed by the main class
const { convertPeerId } = require('libp2p-kad-dht/src/utils')

const log = require('./logger')
const TopicNode = require('../dag/topic-node')
const EventNode = require('../dag/event-node')

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

function getTopic (dht, topicCID, cb) {
  waterfall([
    dht.get.bind(dht, topicCID.buffer, null),
    TopicNode.deserializeCBOR
  ], cb)
}

function getEvent (dht, eventCID, cb) {
  waterfall([
    dht.get.bind(dht, eventCID.buffer, null),
    EventNode.deserializeCBOR
  ], cb)
}

module.exports = {
  closestPeerToPeer,
  store,
  getTopic,
  getEvent
}
