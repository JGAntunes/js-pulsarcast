'use strict'

const assert = require('assert')
const PeerId = require('peer-id')
const dagCBOR = require('ipld-dag-cbor')
const CID = require('cids')

const config = require('../config')
const { linkUnmarshalling, linkMarshalling } = require('./utils')

class EventNode {
  constructor(topicCID, author, payload, options = {}) {
    // TODO check it is a CID maybe?
    assert(topicCID, 'Need a topicCID object to create an event node')
    assert(author, 'Need an author to create an event node')
    assert(payload, 'Need a payload to create an event node')

    this.topicCID = topicCID
    this.author = author
    this.payload = payload
    this.publisher = options.publisher
    this.parent = options.parent

    this.metadata = createMetadata(options.metadata)
  }

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

  static deserializeCBOR(event, cb) {
    dagCBOR.util.deserialize(event, (err, result) => {
      if (err) return cb(err)
      cb(null, EventNode.deserialize(result))
    })
  }

  get isPublished() {
    return Boolean(this.publisher)
  }

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

  getCID(cb) {
    dagCBOR.util.cid(this.serialize(), cb)
  }

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

  serializeCBOR(cb) {
    const serialized = this.serialize()
    dagCBOR.util.serialize(serialized, cb)
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
