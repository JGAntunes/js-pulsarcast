'use strict'

const bs58 = require('bs58')
const dagCBOR = require('ipld-dag-cbor')
const CID = require('cids')

const config = require('../config')
const eventLinkTypes = require('../messages/protobuffers').TopicDescriptor.MetaData.EventLinking
const log = require('../utils/logger')
const {
  linkUnmarshalling,
  linkMarshalling
} = require('./utils')

class TopicNode {
  constructor (name, author, options = {}) {
    this.name = name
    this.author = author
    this.subTopics = options.subTopics
    this.parent = options.parent

    this.metadata = createMetadata(options.metadata)

    log.trace('New topic node %j', {
      name,
      author,
      parent: this.parent ? this.parent.toBaseEncodedString() : null,
      metadata: this.metadata
    })
  }

  static deserialize (topic) {
    log.debug('TOOOOPIC %j', topic)
    const author = bs58.encode(topic.author)
    const parent = linkUnmarshalling(topic.parent)
    // TODO handle sub topic serialization
    const subTopics = topic['#']

    return new TopicNode(topic.name, author, {
      subTopics,
      parent: CID.isCID(parent) ? parent : null,
      metadata: deserializeMetadata(topic.metadata)
    })
  }

  static deserializeCBOR (topic, cb) {
    dagCBOR.util.deserialize(topic, (err, result) => {
      if (err) return cb(err)
      cb(null, TopicNode.deserialize(result))
    })
  }

  getCID (cb) {
    dagCBOR.util.cid(this.serialize(), cb)
  }

  serialize () {
    log.debug('%j', {
      name: this.name,
      author: bs58.decode(this.author),
      parent: linkMarshalling(this.parent),
      // TODO handle sub topic serialization
      '#': this.subTopics || {},
      metadata: serializeMetadata(this.metadata)
    })
    return {
      name: this.name,
      author: bs58.decode(this.author),
      parent: linkMarshalling(this.parent),
      // TODO handle sub topic serialization
      '#': this.subTopics || {},
      metadata: serializeMetadata(this.metadata)
    }
  }

  serializeCBOR (cb) {
    const serialized = this.serialize()
    dagCBOR.util.serialize(serialized, cb)
  }
}

function serializeMetadata (metadata) {
  const allowedPublishers = {enabled: false, peers: []}
  if (metadata.allowedPublishers) {
    allowedPublishers.enabled = true
    allowedPublishers.peers = metadata.allowedPublishers.map((peer) => bs58.decode(peer))
  }

  const requestToPublish = {enabled: false, peers: []}
  if (metadata.requestToPublish) {
    requestToPublish.enabled = true
    requestToPublish.peers = Array.isArray(metadata.requestToPublish)
      ? metadata.requestToPublish.map((peer) => bs58.decode(peer))
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

function deserializeMetadata (metadata) {
  const allowedPublishers = metadata.allowedPublishers.enabled
    ? metadata.allowedPublishers.peers.map((peer) => bs58.encode(peer))
    : false

  let requestToPublish
  if (!metadata.requestToPublish.enabled) requestToPublish = false
  if (metadata.requestToPublish.enabled && !metadata.requestToPublish.peers.length) requestToPublish = true
  else requestToPublish = metadata.requestToPublish.peers.map((peer) => bs58.encode(peer))

  return {
    ...metadata,
    allowedPublishers,
    eventLinking: Object.entries(eventLinkTypes).find(([type, value]) => {
      return value === metadata.eventLinking
    })[0],
    requestToPublish
  }
}

function createMetadata ({
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
