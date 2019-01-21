'use strict'

const bs58 = require('bs58')
const dagCBOR = require('ipld-dag-cbor')

const eventLinkTypes = require('../protobuffers').TopicDescriptor.MetaData.EventLinking
const log = require('../utils/logger')
const {
  linkUnmarshalling,
  linkMarshalling
} = require('./utils')

class TopicNode {
  constructor (name, author, options = {}) {
    log.trace(`New topic node ${name}`)

    this.name = name
    this.author = author
    this.subTopics = options.subTopics
    this.parent = options.parent

    if (options.metadata) {
      this.metadata = options.metadata
    }

    // By default only author publishes
    if (!options.allowedPublishers) {
      options.allowedPublishers = [author]
    }
    this.metadata = createMetadata(options)

    log.trace('New topic node %j', {
      name,
      author,
      parent: this.parent ? this.parent.toBaseEncodedString() : null,
      metadata: this.metadata
    })
  }

  static deserialize (topic) {
    const author = bs58.encode(topic.author)
    const parent = linkUnmarshalling(topic.parent)
    // TODO handle sub topic serialization
    const subTopics = topic['#']

    return new TopicNode(topic.name, author, {
      subTopics,
      parent,
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
      author: bs58.decode(this.author),
      parent: linkMarshalling(this.parent),
      // TODO handle sub topic serialization
      '#': this.subTopics || {},
      metadata:  serializeMetadata(this.metadata)
    }
  }

  serializeCBOR (cb) {
    const serialized = this.serialize()
    dagCBOR.util.serialize(serialized, cb)
  }
}

function serializeMetadata(metadata) {
  const allowedPublishers = metadata.allowedPublishers
    ? {
        enabled: true,
        peers: metadata.allowedPublishers.map((peer) => bs58.decode(peer))
      }
    : {enabled: false, peers: []}

  const requestToPublish = metadata.requestToPublish
    ? {
        enabled: true,
        peers: metadata.requestToPublish.map((peer) => bs58.decode(peer))
      }
    : {enabled: false, peers: []}

  return {
    ...metadata,
    allowedPublishers,
    eventLinking: eventLinkTypes[metadata.eventLinking],
    requestToPublish
  }
}

function deserializeMetadata(metadata) {
  const allowedPublishers = metadata.allowedPublishers.enabled
    : metadata.allowedPublishers.peers.map((peer) => bs58.encode(peer))
    ? false
  const requestToPublish = metadata.requestToPublish.enabled
    : metadata.requestToPublish.peers.map((peer) => bs58.encode(peer))
    ? false

  return {
    ...metadata,
    allowedPublishers,
    eventLinking: Object.entries(eventLinkTypes).find(([type, value]) => {
      return value === message.eventLinking
    })[0],
    requestToPublish
  }
}


function createMetadata ({
  allowedPublishers,
  requestToPublish = true,
  eventLinking = 'LAST_SEEN'}) {

  const now = new Date()
  return {
    protocolVersion: config.protocol,
    created: now.toISOString()
    allowedPublishers,
    requestToPublish, 
    eventLinking
  }
}

module.exports = TopicNode
