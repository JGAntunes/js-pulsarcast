'use strict'

const assert = require('assert')

const log = require('../utils/logger')

// TODO right now memory usage grows indefinitely
class EventTree {
  // TODO probably need access to the DHT?
  constructor(topicNode) {
    // TODO check it is a CID maybe?
    assert(topicNode, 'Need a topicNode object to create an event tree')
    log.trace(`New event tree for topic ${topicNode.name}`)

    this.topicNode = topicNode
    this.eventTree = new Map()
    this.mostRecent = null

    log.trace('New event tree %j', {
      topic: topicNode.name
    })
  }

  addNew(eventNode, options, cb) {
    const done = cb || options
    const { parent } = options
    const eventLinking = this.topicNode.metadata.eventLinking

    if (eventLinking === 'custom' && !parent) {
      return done(new Error('Event requires custom parent to be provided'))
    }

    // Set the parent link
    eventNode.parent = eventLinking === 'custom' ? parent : this.mostRecent

    this.add(eventNode, done)
  }

  add(eventNode, cb) {
    eventNode.getCID((err, eventCID) => {
      if (err) return cb(err)

      if (!this.mostRecent) {
        this.mostRecent = eventCID
      } else {
        const mostRecent = this.get(this.mostRecent)
        const mostRecentDate = mostRecent.metadata.created
        const eventNodeDate = eventNode.metadata.created

        if (mostRecentDate < eventNodeDate) {
          this.mostRecent = eventCID
        }
      }

      this.eventTree.set(eventCID.toBaseEncodedString(), eventNode)
      return cb(null, eventNode)
    })
  }

  get(eventCID) {
    return this.eventTree.get(eventCID.toBaseEncodedString())
  }

  // TODO to should be optional and could be a CID or a number
  // defaults to 1 level of resolution
  resolve(fromCID, to) {}
}

module.exports = EventTree
