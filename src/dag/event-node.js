'use strict'

const assert = require('assert')
const bs58 = require('bs58')
const dagCBOR = require('ipld-dag-cbor')
const CID = require('cids')

const config = require('../config')
const log = require('../utils/logger')
const {
  linkUnmarshalling,
  linkMarshalling
} = require('./utils')

class EventNode {
  constructor (topicCID, author, payload, options = {}) {
    // TODO check it is a CID maybe?
    assert(topicCID, 'Need a topicCID object to create an event tree')

    this.topicCID = topicCID
    this.author = author
    this.payload = payload
    this.publisher = options.publisher
    this.parent = options.parent

    this.metadata = createMetadata(options.metadata)

    log.trace('New event node %j', {
      topic: topicCID.toBaseEncodedString(),
      author,
      publisher: options.publisher,
      parent: this.parent ? this.parent.toBaseEncodedString() : null,
      metadata: this.metadata
    })
  }

  static deserialize (event) {
    const topicCID = linkUnmarshalling(event.topic)
    const publisher = event.publisher ? bs58.encode(event.publisher) : null
    const author = bs58.encode(event.author)
    const payload = event.payload
    const parent = linkUnmarshalling(event.parent)

    return new EventNode(topicCID, author, payload, {
      publisher,
      parent: CID.isCID(parent) ? parent : null,
      metadata: event.metadata
    })
  }

  static deserializeCBOR (event, cb) {
    dagCBOR.util.deserialize(event, (err, result) => {
      if (err) return cb(err)
      cb(null, EventNode.deserialize(result))
    })
  }

  get published () {
    return Boolean(this.publisher)
  }

  getCID (cb) {
    dagCBOR.util.cid(this.serialize(), cb)
  }

  serialize () {
    return {
      topic: linkMarshalling(this.topicCID),
      publisher: this.published ? bs58.decode(this.publisher) : null,
      author: bs58.decode(this.author),
      payload: this.payload,
      parent: linkMarshalling(this.parent),
      metadata: {
        ...this.metadata,
        created: this.metadata.created.toISOString()
      }
    }
  }

  serializeCBOR (cb) {
    const serialized = this.serialize()
    dagCBOR.util.serialize(serialized, cb)
  }
}

function createMetadata ({
  created = new Date(),
  protocolVersion = config.protocol
} = {}) {
  return {
    protocolVersion,
    created: new Date(created)
  }
}


module.exports = EventNode
