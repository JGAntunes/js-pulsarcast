'use strict'

const Pushable = require('pull-pushable')
const lp = require('pull-length-prefixed')
const pull = require('pull-stream')
const EventEmitter = require('events')
const assert = require('assert')

const log = require('./utils/logger')

class Peer extends EventEmitter {
  constructor (peerInfo, conn = null) {
    log.trace('New peer registered %j', {peer: peerInfo.id.toB58String()})
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
      conn
      // pull.onEnd((...args) => {
      //   log.trace(`closing peer conn ${args}`)
      //   this.conn = null
      //   this.stream = null
      //   this.emit('close')
      // })
    )

    this.emit('connection')
  }

  sendMessages (messages) {
    log.trace('Pushing message to peer %j', {peer: this.info.id.toB58String()})
    this.stream.push(messages)
  }

  updateTree (topic, {parents = [], children = []}) {
    this.trees.set(topic, {parents, children})
  }

  removeTree (topic) {
    const tree = this.trees.get(topic)
    if (!tree) return

    this.trees.delete(topic)
    return tree
  }

  addChildren (topic, children) {
    const tree = this.trees.get(topic)
    if (!tree) {
      this.trees.set(topic, {children, parents: []})
      return
    }
    children.forEach((child) => {
      const exists = tree.children.find((peer) => {
        return peer.info.id.isEqual(child.info.id)
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
        return peer.info.id.isEqual(parent.info.id)
      })
      if (!exists) {
        tree.parents.push(parent)
      }
    })
  }

  removePeer (topic, peerId) {
    const tree = this.trees.get(topic)
    const newParents = []
    const newChildren = []
    if (!tree) return

    tree.parents.forEach((parent) => {
      if (parent.info.id.isEqual(peerId)) return
      newParents.push(parent)
    })

    tree.children.forEach((child) => {
      if (child.info.id.isEqual(peerId)) return
      newChildren.push(child)
    })

    tree.children = newChildren
    tree.parents = newParents
  }

  close (callback) {
    // End the pushable
    if (this.stream) {
      this.stream.end()
    }

    setImmediate(() => {
      this.conn = null
      this.stream = null
      this.emit('close')
      callback()
    })
  }

  // Only close the connection if no other
  // topic subscriptions are kept by this peer
  gracefulClose (callback) {
    if (this.trees.size === 0) this.close(callback)
  }
}

module.exports = Peer
