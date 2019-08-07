'use strict'

const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const { waterfall, eachOfLimit, mapLimit } = require('async')

const Node = require('./test-node')

function createNode(maddr, callback) {
  waterfall(
    [
      cb => PeerId.create({ bits: 1024 }, cb),
      (id, cb) => PeerInfo.create(id, cb),
      (peerInfo, cb) => {
        peerInfo.multiaddrs.add(maddr)
        cb(null, new Node({ peerInfo }))
      },
      (node, cb) => node.start(err => cb(err, node))
    ],
    callback
  )
}

function createNodes(nodeNumber, callback) {
  const maddrs = []
  for (let i = 0; i < nodeNumber; i++) {
    maddrs.push('/ip4/127.0.0.1/tcp/0')
  }
  mapLimit(maddrs, 10, createNode, (err, nodes) => {
    if (err) return callback(err)

    // Connect nodes sequentially, essentially creating a ring
    eachOfLimit(
      nodes,
      10,
      (node, index, cb) => {
        let nextNode = nodes[index + 1]
        // End of node list
        if (!nextNode) return cb()
        node.dial(nextNode.peerInfo, cb)
      },
      err => {
        callback(err, nodes)
      }
    )
  })
}

function eventually(func, callback) {
  const polling = setInterval(() => {
    try {
      func()
    } catch (e) {
      if (e.name === 'AssertionError') return
      // Rethrow to avoid swallowing errors
      throw e
    }
    clearInterval(polling)
    callback()
  }, 100)
}

module.exports = {
  createNodes,
  createNode,
  eventually
}
