'use strict'

const PeerId = require('peer-id')
const dagCBOR = require('ipld-dag-cbor')
const CID = require('cids')

const config = require('../config')
const eventLinkTypes = require('../messages/protobuffers').TopicDescriptor.MetaData.EventLinking
const {
  linkUnmarshalling,
  linkMarshalling
} = require('./utils')

class TopicNode {
  constructor (name, author, options = {}) {
    this.name = name
    this.author = author
    this.subTopics = options.subTopics || {}
    this.parent = options.parent || null

    this.metadata = createMetadata(options.metadata)
  }

  static deserialize (topic) {
    const author = PeerId.createFromBytes(topic.author)
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
    return {
      name: this.name,
      author: this.author.toBytes(),
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
    allowedPublishers.peers = metadata.allowedPublishers.map((peer) => peer.toBytes())
  }

  const requestToPublish = {enabled: false, peers: []}
  if (metadata.requestToPublish) {
    requestToPublish.enabled = true
    requestToPublish.peers = Array.isArray(metadata.requestToPublish)
      ? metadata.requestToPublish.map((peer) => peer.toBytes())
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
    ? metadata.allowedPublishers.peers.map((peer) => PeerId.createFromBytes(peer))
    : false

  let requestToPublish
  if (!metadata.requestToPublish.enabled) requestToPublish = false
  if (metadata.requestToPublish.enabled && !metadata.requestToPublish.peers.length) requestToPublish = true
  else requestToPublish = metadata.requestToPublish.peers.map((peer) => PeerId.createFromBytes(peer))

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
