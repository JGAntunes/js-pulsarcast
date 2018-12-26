'use strict'

const assert = require('assert')

const log = require('./utils/logger')

// TODO right now memory usage grows indefinitely
class EventTree {
  // TODO probably need access to the DHT?
  constructor (topicCID, ipld, options = {}) {
    // TODO check it is a CID maybe?
    assert(topicCID, 'Need a topicCID object to create an event tree')
    log.trace(`New event tree for topic ${topicCID.toBaseEncodedString()}`)

    this.topicCID = topicCID
    this.linkHandler = options.linkHandler || mostRecentParent
    this.ipld = ipld
    this.index = new WeakMap()
    this.events = []
    this.mostRecent = null
  }

  add (eventCID, event) {
    let newEvent = Object.assign({}, event)

    if (!newEvent.parent) {
      newEvent = this.linkHanlder(eventCID, event, this.index, this.events)
    }

    // TODO HACK if we don't have the latest state on the topic
    // we're basically breaking the tree...
    if (!this.mostRecent) {
      this.mostReecent = eventCID
    }
    const mostRecent = this.get(this.mostRecent)
    if (mostRecent.metadate.created < event.metadata.createed) {
      this.mostRecent = eventCID
    }

    this.index.set(eventCID.toBaseEncodedString(), newEvent)
    this.events.push(newEvent)
  }

  get (eventCID) {

  }

  // TODO to should be optional and could be a CID or a number
  // defaults to 1 level of resolution
  resolve (fromCID, to) {

  }
}

function mostRecentParent (eventCID, event, eventTree) {
  return Object.assign({}, event, {parent: eventTree.mostRecent})
}

module.exports = EventTree
