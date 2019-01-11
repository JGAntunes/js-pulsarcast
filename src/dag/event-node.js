'use strict'

const assert = require('assert')
const bs58 = require('bs58')
const dagCBOR = require('ipld-dag-cbor')

const log = require('../utils/logger')
const {
  linkUnmarshalling,
  createMetadata,
  linkMarshalling
} = require('./utils')

class EventNode {
  constructor (topicCID, publisher, payload, options = {}) {
    // TODO check it is a CID maybe?
    assert(topicCID, 'Need a topicCID object to create an event tree')

    this.topicCID = topicCID
    this.publisher = publisher
    this.payload = payload
    this.parent = options.parent
    this.metadata = options.metadata || createMetadata()

    log.trace('New event node %j', {
      topic: topicCID.toBaseEncodedString(),
      publisher,
      parent: this.parent ? this.parent.toBaseEncodedString() : null,
      metadata: this.metadata
    })
  }

  static deserialize (event) {
    const topicCID = linkUnmarshalling(event.topic)
    const publisher = bs58.encode(event.publisher)
    const payload = event.payload
    const parent = linkUnmarshalling(event.parent)

    return new EventNode(topicCID, publisher, payload, {
      parent,
      metadata: event.metadata
    })
  }

  static deserializeCBOR (event, cb) {
    dagCBOR.util.deserialize(event, (err, result) => {
      if (err) return cb(err)
      cb(null, EventNode.deserialize(result))
    })
  }

  getCID (cb) {
    dagCBOR.util.cid(this.serialize(), cb)
  }

  serialize () {
    return {
      topic: linkMarshalling(this.topicCID),
      publisher: bs58.decode(this.publisher),
      payload: this.payload,
      parent: linkMarshalling(this.parent),
      metadata: this.metadata
    }
  }

  serializeCBOR (cb) {
    const serialized = this.serialize()
    dagCBOR.util.serialize(serialized, cb)
  }
}

module.exports = EventNode
