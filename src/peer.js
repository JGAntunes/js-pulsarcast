'use strict'

const EventEmitter = require('events')
// const assert = require('assert')

// const log = require('utils/logger')

class Peer extends EventEmitter {
  constructor (peerInfo, conn = null) {
    super()

    this.conn = conn
    this.info = peerInfo
    this.trees = new Map()
  }

  isConnected () {
    return !!this.conn
  }

  attachConnection (conn) {
    if (this.conn) {
      // TODO close previously existing connection
    }
    this.conn = conn
  }

  updateTree (topic, {parents = [], children = []}) {
    this.trees.set(topic, {parents, children})
  }

  addChildren (topic, children) {
    const tree = this.trees.get(topic)
    if (!tree) {
      this.trees.set(topic, {children, parents: []})
      return
    }
    children.forEach((child) => {
      const exists = tree.children.find((peer) => {
        return peer.info.id.toB58String() === child.info.id.toB58String()
      })
      if (!exists) {
        tree.children.push(child)
      }
    })
  }

  addParents (topic, parents) {
    const tree = this.trees.get(topic)
    if (!tree) {
      this.trees.set(topic, {parents, children: []})
      return
    }
    parents.forEach((parent) => {
      const exists = tree.parents.find((peer) => {
        return peer.info.id.toB58String() === parent.info.id.toB58String()
      })
      if (!exists) {
        tree.parents.push(parent)
      }
    })
  }
}

module.exports = Peer
