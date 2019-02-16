'use strict'

const EventEmitter = require('events')
const assert = require('assert')
const lp = require('pull-length-prefixed')
const pull = require('pull-stream')
const CID = require('cids')
const { eachLimit } = require('async')

const log = require('./utils/logger')

const { protobuffers } = require('./messages')
const { protocol } = require('./config')
const createRpcHandlers = require('./rpc')
const Peer = require('./peer')
const EventNode = require('./dag/event-node')
const TopicNode = require('./dag/topic-node')
const TopicTree = require('./dag/topic-tree')

class Pulsarcast extends EventEmitter {
  constructor (libp2p, options = {}) {
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

    // Our event trees
    this.eventTrees = new Map()
    // Our topic tree
    this.topicTree = new TopicTree()

    // This will store the peer neighbours
    this.me = new Peer(libp2p.peerInfo)

    this._onConnection = this._onConnection.bind(this)

    // Monitor pulsarcast messages for debug purposes
    this.libp2p._switch.observer.on('message',
      (peerId, transport, msgProtocol, direction, bufferLength) => {
        if (msgProtocol === protocol) {
          log.trace('message trace %j', { peerId, transport, protocol, direction, bufferLength })
        }
      }
    )

    // Create our handlers to receive and send RPC messages
    this.rpc = createRpcHandlers(this)
  }

  _addPeer (peerInfo, conn) {
    const idB58Str = peerInfo.id.toB58String()
    log.trace('Adding peer %j', {peer: idB58Str})
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
    log.trace('Looking for peer %j', {peer: idB58Str})
    // We already have the peer in our list
    if (peer) return setImmediate(callback, null, peer)

    // Let's dial to it
    this.libp2p.dialProtocol(peerId, protocol, (err, conn) => {
      if (err) return callback(err)
      log.trace('Dialing peer %j', {peer: idB58Str})

      const peerInfo = this.libp2p.peerBook.get(peerId)
      const peer = this._addPeer(peerInfo, conn)
      callback(null, peer)
    })
  }

  _addTopic (topicNode, cb) {
    this.topicTree.add(topicNode, cb)
  }

  _onConnection (protocol, conn) {
    conn.getPeerInfo((err, peerInfo) => {
      if (err) {
        log.err('Failed to identify incomming conn %j', err)
        // Terminate the pull stream
        return pull(pull.empty(), conn)
      }

      this._addPeer(peerInfo, conn)
    })
  }

  _listenToPeerConn (idB58Str, conn, peer) {
    log.trace('Listening to peer %j', {peer: idB58Str})
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
    // log(`RPC message from ${idB58Str}`)
    // Check if we have any RPC msgs
    if (!rpc || !rpc.msgs) return

    rpc.msgs.forEach((msg) => this.rpc.receive.genericHandler(idB58Str, msg))
  }

  _onConnectionEnd (idB58Str, peer, err) {
    if (err) {
      log.error(`Error from ${idB58Str} %j`, err)
    }
    peer.close(() => {
      log.trace('Closed connection to peer', {peer: idB58Str})
      this.peers.delete(idB58Str)
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

    this.libp2p.unhandle(protocol)

    eachLimit(this.peers.values(), 20, (peer, cb) => peer.close(cb), (err) => {
      if (err) return callback(err)

      log.trace('Stopped')
      this.peers = new Map()
      this.started = false
      callback()
    })
  }

  publish (topicB58Str, message) {
    assert(this.started, 'Pulsarcast is not started')

    log.trace('Publishing message %j', {command: 'publish', topic: topicB58Str})

    const payload = Buffer.isBuffer(message)
      ? message
      : Buffer.from(message, 'utf8')
    const topicCID = new CID(topicB58Str)

    const eventNode = new EventNode(topicCID, this.me.info.id, payload)
    this.rpc.receive.event.publish(this.me.info.id.toB58String(), eventNode)
  }

  subscribe (topicB58Str) {
    assert(this.started, 'Pulsarcast is not started')

    if (this.subscriptions.has(topicB58Str)) {
      log.trace('Already subscribed to topic %j', {command: 'subscribe', topic: topicB58Str})
      return
    }

    log.trace('Subscribing to topic %j', {command: 'subscribe', topic: topicB58Str})

    this.subscriptions.add(topicB58Str)
    const topicCID = new CID(topicB58Str)

    this.rpc.receive.topic.join(this.me.info.id.toB58String(), topicCID)
  }

  unsubscribe (topics) {
    // Avoid race conditions, by quietly ignoring unsub when shutdown.
    // if (!this.started) return
  }

  createTopic (topicName, { parent = null } = {}) {
    assert(this.started, 'Pulsarcast is not started')

    log.trace('Creating topic %j', {command: 'subscribe', topicName})

    const myId = this.me.info.id
    // By default only author publishes
    const options = {metadata: {allowedPublishers: [myId]}}

    const topicNode = new TopicNode(topicName, myId, options)
    // TODO subscribe to topic automatically
    this._addTopic(topicNode, (err, linkedTopic) => {
      // TODO proper error handling
      if (err) throw err

      this.rpc.send.topic.new(linkedTopic)
    })
  }
}

module.exports = Pulsarcast
