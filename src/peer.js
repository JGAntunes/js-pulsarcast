'use strict'

const Pushable = require('pull-pushable')
const lp = require('pull-length-prefixed')
const pull = require('pull-stream')
const EventEmitter = require('events')
const assert = require('assert')

// const log = require('utils/logger')

class Peer extends EventEmitter {
  constructor (peerInfo, conn = null) {
    assert(peerInfo, 'Need a peerInfo object to initiate the peer')
    super()

    this.stream = null
    this.conn = conn
    this.info = peerInfo
    this.trees = new Map()

    if (conn) {
      this.attachConnection(conn)
    }
  }

  isConnected () {
    return !!this.conn
  }

  attachConnection (conn) {
    if (this.conn) {
      // TODO close previously existing connection
    }
    this.stream = new Pushable()
    this.conn = conn

    pull(
      this.stream,
      lp.encode(),
      conn,
      pull.onEnd(() => {
        this.conn = null
        this.stream = null
        this.emit('close')
      })
    )
  }

  sendMessages (messages) {
    this.stream.push(messages)
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
