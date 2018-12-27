'use strict'

const bs58 = require('bs58')
const dagCBOR = require('ipld-dag-cbor')

const log = require('../utils/logger')
const {
  linkUnmarshalling,
  createMetadata,
  linkMarshalling
} = require('./utils')

class TopicNode {
  constructor (name, author, options = {}) {
    log.trace(`New topic node ${name}`)

    this.name = name
    this.author = author
    this.subTopics = options.subTopics
    this.parent = options.parent
    this.metadata = options.metadata || createMetadata()
  }

  static deserialize (topic) {
    const author = bs58.encode(topic.author)
    const parent = linkUnmarshalling(topic.parent)
    // TODO handle sub topic serialization
    const subTopics = topic['#']

    return new TopicNode(topic.name, author, {
      subTopics,
      parent,
      metadata: topic.metadata
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
      metadata: this.metadata
    }
  }

  serializeCBOR (cb) {
    const serialized = this.serialize()
    dagCBOR.util.serialize(serialized, cb)
  }
}

module.exports = TopicNode
