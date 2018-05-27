'use strict'

const EventEmitter = require('events')
const assert = require('assert')

// const log = require('utils/logger')

class Pulsarcast extends EventEmitter {
  constructor (libp2p) {
    super()

    this.libp2p = libp2p
    this.started = false

    /**
     * Map of peers.
     *
     * @type {Map<string, Peer>}
     */
    this.peers = new Map()

    /**
     * List of our subscriptions
     * @type {Set<string>}
     */
    this.subscriptions = new Set()

    this._onConnection = this._onConnection.bind(this)
    this._dialPeer = this._dialPeer.bind(this)
  }

  start (callback) {
    if (this.started) {
      return setImmediate(() => callback(new Error('already started')))
    }
  }

  stop (callback) {
    if (!this.started) {
      return setImmediate(() => callback(new Error('not started yet')))
    }
  }

  publish (topics, messages) {
    assert(this.started, 'Pulsarcast is not started')
  }

  subscribe (topics) {
    assert(this.started, 'Pulsarcast is not started')
  }

  unsubscribe (topics) {
    // Avoid race conditions, by quietly ignoring unsub when shutdown.
    // if (!this.started) return
  }
}

module.exports = Pulsarcast
