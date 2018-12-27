'use strict'

// const log = require('../utils/logger')

// TODO right now memory usage grows indefinitely
class TopicTree {
  // TODO probably need access to the DHT?
  constructor () {
    this.topicTree = new Map()
  }

  add (topicNode, cb) {
    topicNode.getCID((err, topicCID) => {
      if (err) return cb(err)

      this.topicTree.set(topicCID.toBaseEncodedString(), topicNode)
      return cb(null, topicNode)
    })
  }

  get (topicCID) {
    return this.eventTree.get(topicCID.toBaseEncodedString())
  }

  // TODO to should be optional and could be a CID or a number
  // defaults to 1 level of resolution
  resolve (fromCID, to) {
  }
}

module.exports = TopicTree
