'use strict'

const assert = require('assert')
const PeerId = require('peer-id')
const dagCBOR = require('ipld-dag-cbor')
const CID = require('cids')

const config = require('../config')
const { linkUnmarshalling, linkMarshalling } = require('./utils')

/**
 * Serialized event representation
 *
 * @typedef {Object} SerializedEvent
 * @property {{'/': Buffer}} topic - The topic DAG link
 * @property {Buffer} author -  The event author
 * @property {Buffer} payload -  Event payload
 * @property {Buffer} publisher -  The event publisher
 * @property {{'/': Buffer}} parent -  The event parent DAG link
 * @property {object} metadata - Event metadata object
 * @property {string} metadata.version - Pulsarcast protocol version used for this event
 * @property {string} metadata.created - Date in ISO string format
 */

/**
 * Human readable event representation
 *
 * @typedef {Object} ReadableEvent
 * @property {string} topicCID
 * @property {string} author -  The event author base58 id
 * @property {Buffer} payload -  Event payload
 * @property {string} publisher -  The event publisher base58 id
 * @property {string} parent -  The event parent base58 id
 * @property {boolean} isPublished
 * @property {object} metadata - Event metadata object
 * @property {string} metadata.version - Pulsarcast protocol version used for this event
 * @property {string} metadata.created - Date in ISO string format
 */

/**
 * A DAG node representing an Event descriptor
 */
class EventNode {
  /**
   * Create a new EventNode.
   *
   * @param {string|CID} topicCID - Topic CID or base58 string for this event
   * @param {external:PeerId} author
   * @param {Buffer} payload - Message to publish
   * @param {object} [options={}]
   * @param {string} [options.parent] - Parent event base58 string
   * @param {string} [options.publisher] - Base58 string id of the publisher node
   * @param {object} [options.metadata={}] - Metadata options
   */
  constructor(topicCID, author, payload, options = {}) {
    // TODO check it is a CID maybe?
    assert(topicCID, 'Need a topicCID object to create an event node')
    assert(author, 'Need an author to create an event node')
    assert(payload, 'Need a payload to create an event node')

    /**
     * Topic CID
     *
     * @type {CID}
     */
    this.topicCID = topicCID ? new CID(topicCID) : null

    /**
     * Author PeerId
     *
     * @type external:PeerId
     */
    this.author = author

    /**
     * The payload of the event
     *
     * @type Buffer
     */
    this.payload = payload

    /**
     * Publisher PeerId
     *
     * @type external:PeerId
     */
    this.publisher = options.publisher

    /**
     * Parent event
     *
     * @type {CID}
     */
    this.parent = options.parent ? new CID(options.parent) : null

    /**
     * Event metadata
     *
     * @type {object}
     * @property {Date} created
     * @property {string} protocolVersion
     */
    this.metadata = createMetadata(options.metadata)
  }

  /**
   * Is the event published
   *
   * @type {boolean}
   */
  get isPublished() {
    return Boolean(this.publisher)
  }

  /**
   * Deserialize a given event and create an EventNode
   *
   * @param {SerializedEvent} event
   * @static
   * @returns {EventNode}
   */
  static deserialize(event) {
    const topicCID = linkUnmarshalling(event.topic)
    const publisher = event.publisher
      ? PeerId.createFromBytes(event.publisher)
      : null
    const author = PeerId.createFromBytes(event.author)
    const payload = event.payload
    const parent = linkUnmarshalling(event.parent)

    return new EventNode(topicCID, author, payload, {
      publisher,
      parent: CID.isCID(parent) ? parent : null,
      metadata: event.metadata
    })
  }

  /**
   * Deserialize a given CBOR buffer representing an event and create an EventNode
   *
   * @param {SerializedEvent} event
   * @param {function(Error, EventNode)} callback
   * @static
   * @returns {void}
   */
  static deserializeCBOR(event, callback) {
    dagCBOR.util.deserialize(event, (err, result) => {
      if (err) return callback(err)
      callback(null, EventNode.deserialize(result))
    })
  }

  /**
   * Return an object representing en event in readable format
   * with string representations of the buffers
   *
   * @returns {ReadableEvent}
   */
  getReadableFormat() {
    return {
      topicCID: this.topicCID.toBaseEncodedString(),
      author: this.author.toB58String(),
      payload: this.payload,
      publisher: this.publisher && this.publisher.toB58String(),
      parent: this.parent && this.parent.toBaseEncodedString(),
      isPublished: this.isPublished,
      metadata: this.metadata
    }
  }

  /**
   * Get the event CID
   *
   * @param {function(Error, CID)} callback
   * @returns {void}
   */
  getCID(callback) {
    dagCBOR.util.cid(this.serialize(), callback)
  }

  /**
   * Serialize this event
   *
   * @returns {SerializedEvent}
   */
  serialize() {
    return {
      topic: linkMarshalling(this.topicCID),
      publisher: this.isPublished ? this.publisher.toBytes() : null,
      author: this.author.toBytes(),
      payload: this.payload,
      parent: linkMarshalling(this.parent),
      metadata: {
        ...this.metadata,
        created: this.metadata.created.toISOString()
      }
    }
  }

  /**
   * Serialize this event to a CBOR buffer representation
   *
   * @param {function(Error, Buffer)} callback
   * @returns {void}
   */
  serializeCBOR(callback) {
    const serialized = this.serialize()
    dagCBOR.util.serialize(serialized, callback)
  }
}

function createMetadata({
  created = new Date(),
  protocolVersion = config.protocol
} = {}) {
  return {
    protocolVersion,
    created: new Date(created)
  }
}

module.exports = EventNode
