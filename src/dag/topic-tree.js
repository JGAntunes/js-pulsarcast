'use strict'

// const log = require('../utils/logger')
//
// Topic trees are actually multidimensional, each
// topic can have new versions of it (childs) and also
// sub-topics

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
      return cb(null, topicNode, topicCID)
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
