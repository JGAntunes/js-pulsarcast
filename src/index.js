'use strict'

const EventEmitter = require('events')
const assert = require('assert')
const lp = require('pull-length-prefixed')
const pull = require('pull-stream')

const log = require('./utils/logger')

const { protobuffers } = require('./messages')
const { protocol } = require('./config')
const Peer = require('./peer')
const CreateRpcHandlers = require('./rpc')

class Pulsarcast extends EventEmitter {
  // TODO for now we're receiving an instance of IPLD
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

    // This will store the peer neighbours
    this.me = new Peer(libp2p.peerInfo)

    this._onConnection = this._onConnection.bind(this)

    // Create our handlers to receive and send RPC messages
    this.rpc = CreateRpcHandlers(this)
  }

  _addPeer (peerInfo, conn) {
    const idB58Str = peerInfo.id.toB58String()
    // Check to see if we already have the peer registered
    let peer = this.peers.get(idB58Str)
    if (peer) {
      peer.attachConnection(conn)
      return peer
    }
    // Create a new peer and insert it in the map
    peer = new Peer(peerInfo, conn)
    this.peers.set(peerInfo.id.toB58String(), peer)
    return peer
  }

  _onConnection (protocol, conn) {
    conn.getPeerInfo((err, peerInfo) => {
      if (err) {
        log.err('Failed to identify incomming conn', err)
        // Terminate the pull stream
        return pull(pull.empty(), conn)
      }

      const idB58Str = peerInfo.id.toB58String()
      const peer = this._addPeer(peerInfo, conn)

      this._processConnection(idB58Str, conn, peer)
    })
  }

  _processConnection (idB58Str, conn, peer) {
    pull(
      conn,
      lp.decode(),
      pull.map((data) => protobuffers.RPC.decode(data)),
      pull.drain(
        (rpc) => this._onRPC(idB58Str, rpc),
        (err) => this._onConnectionEnd(idB58Str, peer, err)
      )
    )
  }

  _onRPC (idB58Str, rpc) {
    log(`RPC message from ${idB58Str}`)
    // Check if we have any RPC msgs
    if (!rpc || !rpc.msgs) return

    rpc.msgs.forEach((msg) => this.rpc.receive.genericHandler(idB58Str, msg))
  }

  _onConnectionEnd (idB58Str, peer, err) {
    log(`Error from ${idB58Str}`, err)
    // TODO clear connection and peer state
  }

  start (callback) {
    log('Starting PulsarCast')
    if (this.started) {
      return setImmediate(() => callback(new Error('already started')))
    }

    this.libp2p.handle(protocol, this._onConnection)
    this.started = true
    setImmediate(() => callback())
  }

  stop (callback) {
    if (!this.started) {
      return setImmediate(() => callback(new Error('not started yet')))
    }
    // TODO
    setImmediate(() => callback())
  }

  publish (topic, message) {
    assert(this.started, 'Pulsarcast is not started')

    const payload = Buffer.isBuffer(message)
      ? message
      : Buffer.from(message, 'utf8')

    const event = {
      publisher: this.me.info.id.toB58Str(),
      payload,
      parent: null
    }

    this.rpc.send.event(topic, event)
  }

  subscribe (topic) {
    assert(this.started, 'Pulsarcast is not started')

    this.rpc.send.topic.join(topic)
  }

  unsubscribe (topics) {
    // Avoid race conditions, by quietly ignoring unsub when shutdown.
    // if (!this.started) return
  }

  createTopic (topicName, { parent = null } = {}) {
    assert(this.started, 'Pulsarcast is not started')

    const options = {
      author: this.me.info.id.toB58Str(),
      parent,
      '#': {}
    }
    this.rpc.send.topic.new(topicName, options)
  }
}

module.exports = Pulsarcast
