'use strict'

const assert = require('assert')

const log = require('../utils/logger')

// TODO right now memory usage grows indefinitely
class EventTree {
  // TODO probably need access to the DHT?
  constructor (topicCID, options = {}) {
    // TODO check it is a CID maybe?
    assert(topicCID, 'Need a topicCID object to create an event tree')
    log.trace(`New event tree for topic ${topicCID.toBaseEncodedString()}`)

    this.topicCID = topicCID
    this.linkHandler = options.linkHandler || mostRecentParent
    this.eventTree = new Map()
    this.mostRecent = null

    log.trace('New event tree %j', {
      topic: topicCID.toBaseEncodedString()
    })
  }

  // TODO right we're mutating eventNode inside this function
  // maybe we should consider a better way?
  add (eventNode, cb) {
    // let newEvent = Object.assign({}, eventNode)

    if (!eventNode.parent) {
      this.linkHandler(eventNode, this)
    }

    eventNode.getCID((err, eventCID) => {
      if (err) return cb(err)
      // TODO HACK if we don't have the latest state on the topic
      // we're basically breaking the tree...
      if (!this.mostRecent) {
        this.mostRecent = eventCID
      } else {
        const mostRecent = this.get(this.mostRecent)

        if (mostRecent.metadata.created < eventNode.metadata.createed) {
          this.mostRecent = eventCID
        }
      }

      this.eventTree.set(eventCID.toBaseEncodedString(), eventNode)
      return cb(null, eventNode)
    })
  }

  get (eventCID) {
    return this.eventTree.get(eventCID.toBaseEncodedString())
  }

  // TODO to should be optional and could be a CID or a number
  // defaults to 1 level of resolution
  resolve (fromCID, to) {
  }
}

function mostRecentParent (eventNode, eventTree) {
  return Object.assign(eventNode, {parent: eventTree.mostRecent})
}

module.exports = EventTree
