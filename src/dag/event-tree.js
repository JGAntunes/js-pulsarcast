'use strict'

const assert = require('assert')

// TODO right now memory usage grows indefinitely
/**
 * A representation of an event tree for a given topic
 */
class EventTree {
  // TODO probably need access to the DHT?
  /**
   * Create a new EventTree.
   *
   * @param {TopicNode} topicNode
   */
  constructor(topicNode) {
    assert(topicNode, 'Need a topicNode object to create an event tree')

    /**
     * Topic node
     *
     * @type {TopicNode}
     */
    this.topicNode = topicNode

    /**
     * Event map used to keep track of events for a given topic. Indexed by CID
     * base58 string
     *
     * @type {Map.<string,EventNode>}
     */
    this.eventMap = new Map()

    /**
     * The most recent event for this topic
     *
     * @type {EventNode}
     */
    this.mostRecent = null
  }

  /**
   * Adds a newly created event to the event tree and links it correctly
   *
   * @param {EventNode} eventNode
   * @param {object} [options={}]
   * @param {string} [options.parent=null] - Parent  base58 string to link the event to, if the topic allows custom linking
   * @param {function(Error, EventNode)} callback - Returns the updated event node
   * @return {void}
   */
  addNew(eventNode, options, callback) {
    const done = callback || options
    const { parent } = options
    const eventLinking = this.topicNode.metadata.eventLinking

    if (eventLinking === 'custom' && !parent) {
      return done(new Error('Event requires custom parent to be provided'))
    }

    // Set the parent link
    eventNode.parent = eventLinking === 'custom' ? parent : this.mostRecent

    this.add(eventNode, done)
  }

  /**
   * Adds an event to the topic tree, updating the most recent event ref
   *
   * @param {EventNode} eventNode
   * @param {function(Error, EventNode)} callback - Returns the event node
   * @return {void}
   */
  add(eventNode, callback) {
    eventNode.getCID((err, eventCID) => {
      if (err) return callback(err)

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

      this.eventMap.set(eventCID.toBaseEncodedString(), eventNode)
      return callback(null, eventNode)
    })
  }

  /**
   * Get an event from this tree
   *
   * @param {CID} eventCID
   * @return {EventNode}
   */
  get(eventCID) {
    return this.eventMap.get(eventCID.toBaseEncodedString())
  }

  // TODO to should be optional and could be a CID or a number
  // defaults to 1 level of resolution
  resolve(fromCID, to) {}
}

module.exports = EventTree
