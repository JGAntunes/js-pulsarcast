'use strict'

const EventEmitter = require('events')
const assert = require('assert')
const lp = require('pull-length-prefixed')
const pull = require('pull-stream')
const CID = require('cids')
const { eachLimit, series } = require('async')

const log = require('./utils/logger')
const { getTopic } = require('./utils/dht-helpers')

const { protobuffers } = require('./messages')
const { protocol, retryOnClose } = require('./config')
const createRpcHandlers = require('./rpc')
const Peer = require('./peer')
const EventNode = require('./dag/event-node')
const TopicNode = require('./dag/topic-node')

/**
 * CID (Content Identifier)
 *
 * @external CID
 * @see {@link https://github.com/multiformats/js-cid#api}
 */

/**
 * Libp2p node
 *
 * @external Libp2pNode
 * @see {@link https://github.com/libp2p/js-libp2p#api}
 */

/**
 * A Javascript implementation of Pulsarcast
 *
 * See design and specs at https://github.com/JGAntunes/pulsarcast
 */
class Pulsarcast extends EventEmitter {
  /**
   * Create a new PulsarCast node.
   *
   * @param {external:Libp2pNode} libp2p
   * @param {object} [options={}] - PulsarCast options
   */
  constructor(libp2p, options = {}) {
    super()

    /**
     * Local ref to the libp2p node.
     *
     * @type {external:Libp2pNode}
     */
    this.libp2p = libp2p

    /**
     * Node current status info.
     *
     * @type boolean
     */
    this.started = false

    /**
     * Map of peers.
     *
     * @type {Map.<string, Peer>}
     */
    this.peers = new Map()

    /**
     * Map of topics.
     *
     * @type {Map.<string, TopicNode>}
     */
    this.topics = new Map()

    /**
     * List of our subscriptions
     * @type {Set.<string>}
     */
    this.subscriptions = new Set()

    /**
     * Map of the event dissemination trees.
     *
     * @type {Map.<string, EventTree>}
     */
    this.eventTrees = new Map()

    /**
     * This node peer object.
     *
     * @type {Peer}
     */
    this.me = new Peer(libp2p.peerInfo)

    this._onConnection = this._onConnection.bind(this)

    // Monitor pulsarcast messages for debug purposes
    // this.libp2p._switch.observer.on(
    //   'message',
    //   (peerId, transport, msgProtocol, direction, bufferLength) => {
    //     if (msgProtocol === protocol) {
    //       log.trace('message trace %j', {
    //         peerId,
    //         transport,
    //         protocol,
    //         direction,
    //         bufferLength
    //       })
    //     }
    //   }
    // )

    // TODO set this kind of logs behind a flag and with configurable period
    this._stats = {
      rpc: { in: 0, out: 0, topics: {} }
    }
    setInterval(() => {
      // Topic tree state
      for (let [topicB58Str, tree] of this.me.trees.entries()) {
        log.trace('Topic tree %j', {
          tree: true,
          topic: topicB58Str,
          children: tree.children.map(child => child.info.id.toB58String()),
          childrenSize: tree.children.length,
          parents: tree.parents.map(parent => parent.info.id.toB58String()),
          parentsSize: tree.parents.length
        })
      }

      // Event tree state
      for (let [topicB58Str, tree] of this.eventTrees.entries()) {
        log.trace('Events %j', {
          events: true,
          topic: topicB58Str,
          size: tree.eventMap.size
        })
      }

      // Subscriptions
      log.trace('Subscriptions %j', {
        subscriptions: true,
        size: this.subscriptions.size
      })

      // Peers
      log.trace('Peers %j', {
        peers: true,
        size: this.peers.size
      })

      // Protocol data
      if (this.libp2p.stats.forProtocol(protocol)) {
        log.trace('Libp2p protocol data %j', {
          libp2pProtocol: true,
          ...this.libp2p.stats.forProtocol(protocol).snapshot
        })
      }

      // RPC IN/OUT
      log.trace('RPC IN/OUT %j', {
        rpc: true,
        in: this._stats.rpc.in,
        out: this._stats.rpc.out
      })

      for (let [topicB58Str, stats] of Object.entries(this._stats.rpc.topics)) {
        log.trace('RPC IN/OUT %j', {
          rpcTopics: true,
          topic: topicB58Str,
          ...stats
        })
      }
    }, 60 * 1000)

    // Create our handlers to receive and send RPC messages
    this.rpc = createRpcHandlers(this)
  }

  _addPeer(peerInfo, conn) {
    const idB58Str = peerInfo.id.toB58String()
    log.trace('Adding peer %j', { peer: idB58Str })
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
    peer.once('close', () => {
      this.peers.delete(idB58Str)
    })
    // Insert peer in list
    this.peers.set(idB58Str, peer)
    // Attach peer conn to our rpc handlers
    this._listenToPeerConn(idB58Str, conn, peer)
    return peer
  }

  _getPeer(peerId, callback) {
    const idB58Str = peerId.toB58String()
    const peer = this.peers.get(idB58Str)
    log.trace('Looking for peer %j', { peer: idB58Str })
    // We already have the peer in our list
    if (peer) return setImmediate(callback, null, peer)

    // Let's dial to it
    this.libp2p.dialProtocol(peerId, protocol, (err, conn) => {
      if (err) return callback(err)
      log.trace('Dialing peer %j', { peer: idB58Str })

      const peerInfo = this.libp2p.peerBook.get(peerId)
      const peer = this._addPeer(peerInfo, conn)
      callback(null, peer)
    })
  }

  _addTopic(topicNode, callback) {
    topicNode.getCID((err, topicCID) => {
      if (err) return callback(err)
      this.topics.set(topicCID.toBaseEncodedString(), topicNode)
      callback(null, topicNode, topicCID)
    })
  }

  _getTopic(topicCID, callback) {
    const topicB58Str = topicCID.toBaseEncodedString()

    // log.trace('Looking for topic %j', { topic: topicB58Str })

    const topicNode = this.topics.get(topicB58Str)
    // We have the topic locally
    if (topicNode) return callback(null, topicNode)
    // Perform a DHT query for it
    getTopic(this.libp2p._dht, topicCID, (err, topicNode) => {
      if (err) return callback(err)

      this._addTopic(topicNode, callback)
    })
  }

  _onConnection(protocol, conn) {
    conn.getPeerInfo((err, peerInfo) => {
      if (err) {
        log.err('Failed to identify incomming conn %j', err)
        // Terminate the pull stream
        return pull(pull.empty(), conn)
      }

      this._addPeer(peerInfo, conn)
    })
  }

  _listenToPeerConn(idB58Str, conn, peer) {
    // log.trace('Listening to peer %j', { peer: idB58Str })
    pull(
      conn,
      lp.decode(),
      pull.map(data => protobuffers.RPC.decode(data)),
      pull.drain(
        rpc => this._onRPC(idB58Str, rpc),
        err => this._onConnectionEnd(err, idB58Str, peer)
      )
    )
  }

  _onRPC(idB58Str, rpc) {
    // log(`RPC message from ${idB58Str}`)
    // Check if we have any RPC msgs
    if (!rpc || !rpc.msgs) return

    rpc.msgs.forEach(msg => this.rpc.receive.genericHandler(idB58Str, msg))
  }

  _onConnectionEnd(err, idB58Str, peer) {
    if (err) {
      log.error(`Error from ${idB58Str} %j`, err)
    }
    const peerUsedInTopics = []
    series(
      [
        // First close the stream and clean connection state
        done => {
          // log.trace('Closing connection to peer', { peer: idB58Str })
          peer.close(done)
        },
        done => {
          // Check if this peer is a parent to any of our topics
          for (let [topicB58Str, tree] of this.me.trees.entries()) {
            if (
              tree.parents.find(parent => parent.info.id.isEqual(peer.info.id))
            ) {
              peerUsedInTopics.push(topicB58Str)
            }
            // Remove every occurrence of this peer in this topic tree
            this.me.removePeer(topicB58Str, peer.info.id)
          }

          // Unused peer, move on
          if (peerUsedInTopics.length === 0) return done()

          // We need it, retry connecting to it
          this._retryConnection(0, peer, done)
        }
      ],
      err => {
        if (err) {
          log.error('Connection retry failed', {
            topics: peerUsedInTopics,
            peer: peer.info.id.toB58String()
          })
          // Delete peer since we couldn't reconnect
          this.peers.delete(idB58Str)
          // Connection failed and we depend on it, resubscribe through regular approach
          if (peerUsedInTopics > 0) {
            eachLimit(
              peerUsedInTopics,
              20,
              (topicB58Str, done) => this.subscribe(topicB58Str, done),
              err => {
                if (err)
                  log.error('Parent of topic dropped and subscription failed', {
                    topics: peerUsedInTopics,
                    peer: peer.info.id.toB58String()
                  })
              }
            )
          }
        }

        // Delete the peer since we no longer need it
        if (peerUsedInTopics === 0) this.peers.delete(idB58Str)
      }
    )
  }

  _retryConnection(attemptNumber, peer, callback) {
    // const idB58Str = peer.info.id.toB58String()
    // Let's dial to it
    // log.trace('Redialing peer %j', { peer: idB58Str })
    this.libp2p.dialProtocol(peer.info.id, protocol, (err, conn) => {
      if (err) {
        if (attemptNumber < retryOnClose)
          return this._retryConnection(++attemptNumber, peer, callback)
        return callback(err)
      }

      const peerInfo = this.libp2p.peerBook.get(peer.info.id)
      this._addPeer(peerInfo, conn)
      callback()
    })
  }

  /**
   * Start the PulsarCast node
   *
   * @param {function(Error)} callback
   * @return {void}
   */
  start(callback) {
    log('Starting PulsarCast')
    if (this.started) {
      return setImmediate(callback, new Error('already started'))
    }

    this.libp2p.handle(protocol, this._onConnection)

    this.started = true
    log.trace('Ready')
    setImmediate(callback)
  }

  /**
   * Stop the PulsarCast node
   *
   * @param {function(Error)} callback
   * @return {void}
   */
  stop(callback) {
    if (!this.started) {
      return setImmediate(() => callback(new Error('not started yet')))
    }

    this.libp2p.unhandle(protocol)

    eachLimit(
      this.peers.values(),
      20,
      (peer, cb) => peer.close(cb),
      err => {
        if (err) return callback(err)

        log.trace('Stopped')
        this.peers = new Map()
        this.started = false
        callback()
      }
    )
  }

  /**
   * Publish a message in the specified topic
   *
   * @param {string} topicB58Str - topic base58 string
   * @param {Buffer} message - message to publish
   * @param {function(Error)} callback
   * @return {void}
   */
  publish(topicB58Str, message, callback) {
    assert(this.started, 'Pulsarcast is not started')

    let eventNode
    try {
      const payload = Buffer.isBuffer(message)
        ? message
        : Buffer.from(message, 'utf8')
      const topicCID = new CID(topicB58Str)

      eventNode = new EventNode(topicCID, this.me.info.id, payload)
    } catch (e) {
      return setImmediate(callback, e)
    }

    log.trace('Publishing message %j', {
      command: 'publish',
      topic: topicB58Str,
      created: eventNode.metadata.created
    })

    this.rpc.receive.event.publish(
      this.me.info.id.toB58String(),
      eventNode,
      callback
    )
  }

  /**
   * Subscribe to a specific topic
   *
   * @param {string} topicB58Str - topic base58 string
   * @param {object} [options={}]
   * @param {object} [options.subscribeToMeta=true] - optionally subscribe to this topic meta updates (updates to the topic descriptor)
   * @param {function(Error, TopicNode)} callback
   * @return {void}
   */
  subscribe(topicB58Str, options, callback) {
    assert(this.started, 'Pulsarcast is not started')
    if (!callback) {
      callback = options
      options = {}
    }

    const topicCID = new CID(topicB58Str)

    // By default subscribe to meta topic
    const defaultSubscribeOptions = {
      subscribeToMeta: true
    }

    const subscribeOptions = { ...defaultSubscribeOptions, ...options }

    if (this.subscriptions.has(topicB58Str)) {
      // log.trace('Already subscribed to topic %j', {
      //   command: 'subscribe',
      //   topic: topicB58Str
      // })
      return this._getTopic(topicCID, (err, topicNode) => {
        callback(err, topicNode, topicCID)
      })
    }

    log.trace('Subscribing to topic %j', {
      command: 'subscribe',
      topic: topicB58Str
    })

    this.subscriptions.add(topicB58Str)

    this.rpc.receive.topic.join(
      this.me.info.id.toB58String(),
      topicCID,
      subscribeOptions,
      callback
    )
  }

  /**
   * Unsubscribe from a specific topic
   *
   * @param {string} topicB58Str - topic base58 string
   * @param {object} [options.unsubscribeFromMeta=true] - optionally unsubscribe from this topic meta updates (updates to the topic descriptor)
   * @param {function(Error)} callback
   */
  unsubscribe(topicB58Str, options, callback) {
    assert(this.started, 'Pulsarcast is not started')
    if (!callback) {
      callback = options
      options = {}
    }

    // By default unsubscribe to meta topic
    const defaultUnsubscribeOptions = {
      unsubscribeFromMeta: true
    }

    const unsubscribeOptions = { ...defaultUnsubscribeOptions, ...options }

    if (!this.subscriptions.has(topicB58Str)) {
      // log.trace('Not subscribed to topic %j', {
      //   command: 'unsubscribe',
      //   topic: topicB58Str
      // })
      return setImmediate(callback)
    }

    log.trace('Unsubscribing from topic %j', {
      command: 'unsubscribe',
      topic: topicB58Str
    })

    this.subscriptions.delete(topicB58Str)
    const topicCID = new CID(topicB58Str)

    this.rpc.receive.topic.leave(
      this.me.info.id.toB58String(),
      topicCID,
      unsubscribeOptions,
      callback
    )
  }

  /**
   * Create a topic
   *
   * @param {string} topicName - topic name
   * @param {object} [options={}] - Topic creation options
   * @param {string} [options.parent=null] - Parent topic base58 string
   * @param {object.<string, string>} [options.subTopics={}] - Sub topics map, with names as keys and base58 strings as values
   * @param {object} [options.metadata={}] - Metadata options
   * @param {array.<string>} [options.metadata.allowedPublishers] - Allowed publishers (defaults to only this node)
   * @param {boolean} [options.metadata.requestToPublish=true] - Allow other nodes to request to publish
   * @param {string} [options.metadata.eventLinking=LAST_SEEN] - Method used for linking events
   * @param {function(Error, CID, TopicNode)} callback
   * @return {void}
   */
  createTopic(topicName, options, callback) {
    assert(this.started, 'Pulsarcast is not started')

    if (!callback) {
      callback = options
      options = {}
    }

    const myId = this.me.info.id
    // By default, no parent, no sub topics, only author publishes
    const defaultTopicOptions = {
      subTopics: {},
      parent: null,
      metadata: { allowedPublishers: [myId] }
    }

    log.trace('Creating topic %j', { command: 'create-topic', topicName })

    const topicOptions = { ...defaultTopicOptions, ...options }
    const topicNode = new TopicNode(topicName, myId, topicOptions)
    this.rpc.send.topic.new(topicNode, callback)
  }
}

module.exports = Pulsarcast
