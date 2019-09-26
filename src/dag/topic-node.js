'use strict'

const assert = require('assert')
const PeerId = require('peer-id')
const dagCBOR = require('ipld-dag-cbor')
const CID = require('cids')

const config = require('../config')
const eventLinkTypes = require('../messages/protobuffers').TopicDescriptor
  .MetaData.EventLinking
const { linkUnmarshalling, linkMarshalling } = require('./utils')

/**
 * Peer identifier object
 *
 * @external PeerId
 * @see {@link https://github.com/libp2p/js-libp2p#ap://github.com/libp2p/js-peer-id#api}
 */

/**
 * Serialized topic representation
 *
 * @typedef {Object} SerializedTopic
 * @property {string} name - The topic name
 * @property {Buffer} author -  The topic author
 * @property {{'/': Buffer}} parent -  The topic parent DAG link
 * @property {object.<string, {'/': Buffer}>} # -  The topic sub topics, were the keys are names and the values DAG links
 * @property {object} metadata - Topic metadata object
 * @property {string} metadata.created - Date in ISO string format
 * @property {Array.<Buffer>} metadata.allowedPublishers - Array of peer ids allowed to publish
 * @property {Array.<Buffer>} metadata.requestToPublish - Array of peer ids allowed to request to publish
 * @property {string} metadata.version - Pulsarcast protocol version used for this topic
 * @property {string} metadata.eventLinking - Event linking method used for this topic
 */

/**
 * Human readable topic representation
 *
 * @typedef {Object} ReadableTopic
 * @property {string} name - The topic name
 * @property {string} author -  The topic author base58 id
 * @property {string} parent -  The topic parent base58 id
 * @property {object.<string, string>} # -  The topic sub topics, where the keys are names and the values base58 representations of the topic
 * @property {object} metadata - Topic metadata object
 * @property {string} metadata.created - Date in ISO string format
 * @property {Array.<string>} metadata.allowedPublishers - Array of base58 peer ids allowed to publish
 * @property {Array.<string>} metadata.requestToPublish - Array of base58 peer ids allowed to request to publish
 * @property {string} metadata.version - Pulsarcast protocol version used for this topic
 * @property {string} metadata.eventLinking - Event linking method used for this topic
 */

/**
 * A DAG node representing a Topic descriptor
 */
class TopicNode {
  /**
   * Create a new TopicNode.
   *
   * @param {string} name
   * @param {external:PeerId} author
   * @param {object} [options={}]
   * @param {string} [options.parent=null] - Parent topic base58 string
   * @param {object.<string, string>} [options.subTopics={}] - Sub topics map, with names as keys and base58 strings as values
   * @param {object} [options.metadata={}] - Metadata options
   * @param {array.<string>} [options.metadata.allowedPublishers] - Allowed publishers (defaults to only this node)
   * @param {boolean} [options.metadata.requestToPublish=true] - Allow other nodes to request to publish
   * @param {string} [options.metadata.eventLinking=LAST_SEEN] - Method used for linking events
   */
  constructor(name, author, options = {}) {
    assert(author, 'Need an author to create a topic node')

    /**
     * Topic human readable name.
     *
     * @type string
     */
    this.name = name

    /**
     * Author PeerId
     *
     * @type external:PeerId
     */
    this.author = author

    /**
     * Sub topics
     *
     * @type {object.<string, CID>}
     */
    this.subTopics = {}

    // Check both parent and subTopics are CIDs
    /**
     * Parent topic
     *
     * @type {CID}
     */
    this.parent = options.parent ? new CID(options.parent) : null
    if (options.subTopics) {
      /**
       * Sub topics
       *
       * @type {object.<string, CID>}
       */
      this.subTopics = Object.entries(options.subTopics)
        .map(([name, topicB58Str]) => ({ [name]: new CID(topicB58Str) }))
        .reduce((topics, topic) => ({ ...topic, ...topics }), {})
    }

    /**
     * Topic metadata
     *
     * @type {object}
     * @property {boolean} allowedPublishers
     * @property {boolean} requestToPublish
     * @property {string} eventLinking
     * @property {Date} created
     * @property {string} protocolVersion
     */
    this.metadata = createMetadata(options.metadata)
  }

  /**
   * Deserialize a given topic and create a TopicNode
   *
   * @param {SerializedTopic} topic
   * @static
   * @returns {TopicNode}
   */
  static deserialize(topic) {
    const author = PeerId.createFromBytes(topic.author)
    const parent = linkUnmarshalling(topic.parent)
    const subTopics = Object.entries(topic['#'])
      .map(([name, dagLink]) => {
        return { [name]: linkUnmarshalling(dagLink) }
      })
      .reduce((topics, topic) => ({ ...topic, ...topics }), {})

    return new TopicNode(topic.name, author, {
      subTopics,
      parent: CID.isCID(parent) ? parent : null,
      metadata: deserializeMetadata(topic.metadata)
    })
  }

  /**
   * Deserialize a given CBOR buffer representing a topic and create a TopicNode
   *
   * @param {SerializedTopic} topic
   * @param {function(Error, TopicNode)} callback
   * @static
   * @returns {void}
   */
  static deserializeCBOR(topic, callback) {
    dagCBOR.util.deserialize(topic, (err, result) => {
      if (err) return callback(err)
      callback(null, TopicNode.deserialize(result))
    })
  }

  /**
   * Return an object representing a topic in readable format
   * with string representations of the buffers
   *
   * @returns {ReadableTopic}
   */
  getReadableFormat() {
    const allowedPublishers = Array.isArray(this.metadata.allowedPublishers)
      ? this.metadata.allowedPublishers.map(p => p.toB58String())
      : this.metadata.allowedPublishers
    const requestToPublish = Array.isArray(this.metadata.requestToPublish)
      ? this.metadata.requestToPublish.map(p => p.toB58String())
      : this.metadata.requestToPublish
    const subTopics =
      this.subTopics &&
      Object.entries(this.subTopics)
        .map(([name, cid]) => [name, cid.toBaseEncodedString()])
        .reduce((obj, values) => ({ ...obj, [values[0]]: values[1] }), {})
    return {
      name: this.name,
      author: this.author.toB58String(),
      parent: this.parent && this.parent.toBaseEncodedString(),
      subTopics,
      metadata: {
        ...this.metadata,
        allowedPublishers,
        requestToPublish
      }
    }
  }

  /**
   * Get the topic CID
   *
   * @param {function(Error, CID)} callback
   * @returns {void}
   */
  getCID(callback) {
    dagCBOR.util.cid(this.serialize(), callback)
  }

  /**
   * Serialize this topic
   *
   * @returns {SerializedTopic}
   */
  serialize() {
    return {
      name: this.name,
      author: this.author.toBytes(),
      parent: linkMarshalling(this.parent),
      '#': Object.entries(this.subTopics)
        .map(([name, cid]) => {
          return { [name]: linkMarshalling(cid) }
        })
        .reduce((topics, topic) => ({ ...topic, ...topics }), {}),
      metadata: serializeMetadata(this.metadata)
    }
  }

  /**
   * Serialize this topic to a CBOR buffer representation
   *
   * @param {function(Error, Buffer)} callback
   * @returns {void}
   */
  serializeCBOR(callback) {
    const serialized = this.serialize()
    dagCBOR.util.serialize(serialized, callback)
  }
}

function serializeMetadata(metadata) {
  const allowedPublishers = { enabled: false, peers: [] }
  if (metadata.allowedPublishers) {
    allowedPublishers.enabled = true
    allowedPublishers.peers = metadata.allowedPublishers.map(peer =>
      peer.toBytes()
    )
  }

  const requestToPublish = { enabled: false, peers: [] }
  if (metadata.requestToPublish) {
    requestToPublish.enabled = true
    requestToPublish.peers = Array.isArray(metadata.requestToPublish)
      ? metadata.requestToPublish.map(peer => peer.toBytes())
      : []
  }

  return {
    ...metadata,
    created: metadata.created.toISOString(),
    allowedPublishers,
    eventLinking: eventLinkTypes[metadata.eventLinking],
    requestToPublish
  }
}

function deserializeMetadata(metadata) {
  const allowedPublishers = metadata.allowedPublishers.enabled
    ? metadata.allowedPublishers.peers.map(peer => PeerId.createFromBytes(peer))
    : false

  let requestToPublish
  if (!metadata.requestToPublish.enabled) requestToPublish = false
  if (
    metadata.requestToPublish.enabled &&
    !metadata.requestToPublish.peers.length
  )
    requestToPublish = true
  else
    requestToPublish = metadata.requestToPublish.peers.map(peer =>
      PeerId.createFromBytes(peer)
    )

  return {
    ...metadata,
    allowedPublishers,
    eventLinking: Object.entries(eventLinkTypes).find(([type, value]) => {
      return value === metadata.eventLinking
    })[0],
    requestToPublish
  }
}

function createMetadata({
  allowedPublishers = false,
  requestToPublish = true,
  eventLinking = 'LAST_SEEN',
  created = new Date(),
  protocolVersion = config.protocol
} = {}) {
  return {
    protocolVersion,
    created: new Date(created),
    allowedPublishers,
    requestToPublish,
    eventLinking
  }
}

module.exports = TopicNode
