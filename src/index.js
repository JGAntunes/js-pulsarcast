'use strict'

const EventEmitter = require('events')
const assert = require('assert')
const lp = require('pull-length-prefixed')
const pull = require('pull-stream')
const CID = require('cids')

const log = require('./utils/logger')

const { protobuffers } = require('./messages')
const { protocol } = require('./config')
const Peer = require('./peer')
const CreateRpcHandlers = require('./rpc')
const EventNode = require('./dag/event-node')

class Pulsarcast extends EventEmitter {
  constructor (libp2p, options = {}) {
    super()

    this.libp2p = libp2p
    this.started = false
    this.eventLinkHandler = options.eventLinkHandler

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

    // Monitor pulsarcast messages for debug purposes
    this.libp2p._switch.observer.on('message',
      (peerId, transport, msgProtocol, direction, bufferLength) => {
        if (msgProtocol === protocol) {
          log.trace({ peerId, transport, protocol, direction, bufferLength })
        }
      }
    )

    // Create our handlers to receive and send RPC messages
    this.rpc = CreateRpcHandlers(this)
  }

  _addPeer (peerInfo, conn) {
    const idB58Str = peerInfo.id.toB58String()
    log.trace(`Adding peer ${idB58Str}`)
    // Check to see if we already have the peer registered
    let peer = this.peers.get(idB58Str)
    // We already have the peer listed, just attach to connection
    if (peer) {
      peer.attachConnection(conn)
      // Attach peer conn to our rpc handlers
      this._listenToPeerConn(idB58Str, conn, peer)
      return peer
    }
    // Create a new peer and insert it in the map
    peer = new Peer(peerInfo, conn)
    // If connection closes, remove peer from list
    peer.once('close', () => () => {
      this.peers.delete(idB58Str)
    })
    // Insert peer in list
    this.peers.set(idB58Str, peer)
    // Attach peer conn to our rpc handlers
    this._listenToPeerConn(idB58Str, conn, peer)
    return peer
  }

  _getPeer (peerId, callback) {
    const idB58Str = peerId.toB58String()
    const peer = this.peers.get(idB58Str)
    log.trace(`Get peer ${idB58Str}`)
    // We already have the peer in our list
    if (peer) return setImmediate(callback, null, peer)

    // Let's dial to it
    this.libp2p.dialProtocol(peerId, protocol, (err, conn) => {
      if (err) return callback(err)
      log.trace(`Dialing peer ${idB58Str}`)

      const peerInfo = this.libp2p.peerBook.get(peerId)
      const peer = this._addPeer(peerInfo, conn)
      callback(null, peer)
    })
  }

  _onConnection (protocol, conn) {
    conn.getPeerInfo((err, peerInfo) => {
      if (err) {
        log.err('Failed to identify incomming conn', err)
        // Terminate the pull stream
        return pull(pull.empty(), conn)
      }

      this._addPeer(peerInfo, conn)
    })
  }

  _listenToPeerConn (idB58Str, conn, peer) {
    log(`Listening to peer connection ${idB58Str}`)
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
    log.error(`Error from ${idB58Str}`, err)
    peer.close(() => {
      log.trace(`Successfully closed connection for peer ${idB58Str}`)
    })
  }

  start (callback) {
    log('Starting PulsarCast')
    if (this.started) {
      return setImmediate(() => callback(new Error('already started')))
    }

    this.libp2p.handle(protocol, this._onConnection)

    this.started = true
    log.trace('Ready')
    setImmediate(() => callback())
  }

  stop (callback) {
    if (!this.started) {
      return setImmediate(() => callback(new Error('not started yet')))
    }
    // TODO clean up all peer conns
    setImmediate(() => callback())
  }

  publish (topicB58Str, message) {
    assert(this.started, 'Pulsarcast is not started')

    log(`Publishing message on topic ${topicB58Str}`)

    const payload = Buffer.isBuffer(message)
      ? message
      : Buffer.from(message, 'utf8')
    const topicCID = new CID(topicB58Str)

    const eventNode = new EventNode(topicCID, this.me.info.id.toB58String(), payload)

    this.rpc.send.event(topicB58Str, eventNode)
  }

  subscribe (topic) {
    assert(this.started, 'Pulsarcast is not started')

    log(`Subscribing to topic ${topic}`)

    this.subscriptions.add(topic)

    this.rpc.send.topic.join(topic)
  }

  unsubscribe (topics) {
    // Avoid race conditions, by quietly ignoring unsub when shutdown.
    // if (!this.started) return
  }

  createTopic (topicName, { parent = null } = {}) {
    assert(this.started, 'Pulsarcast is not started')

    log(`Creating topic ${topicName}`)

    const options = {
      author: this.me.info.id.toB58String(),
      parent,
      '#': {}
    }
    this.rpc.send.topic.new(topicName, options)
  }
}

module.exports = Pulsarcast
