'use strict'

const { eachLimit, waterfall } = require('async')

const EventTree = require('../dag/event-tree')
const TopicNode = require('../dag/topic-node')
const { createRPC, marshalling, protobuffers } = require('../messages')
const log = require('../utils/logger')
const { closestPeerToPeer, store } = require('../utils/dht-helpers')

const RPC = protobuffers.RPC

function createRPCHandlers(pulsarcastNode) {
  const dht = pulsarcastNode.libp2p._dht

  return {
    event: {
      publish,
      requestToPublish
    },
    topic: {
      join: joinTopic,
      leave: leaveTopic,
      new: newTopic
    }
  }

  function publish(topicNode, eventNode, fromIdB58Str, options, callback) {
    if (!callback) {
      callback = options
      options = {}
    }

    const { me } = pulsarcastNode
    const myId = me.info.id
    const isNewEvent = options.isNewEvent

    if (isNewEvent) {
      // Set the publisher
      eventNode.publisher = myId
    }

    waterfall(
      [
        topicNode.getCID.bind(topicNode),
        (topicCID, cb) => {
          addEvent(
            topicCID,
            topicNode,
            eventNode,
            { createLink: isNewEvent },
            cb
          )
        },
        (linkedEvent, cb) => {
          if (!isNewEvent) {
            return linkedEvent.getCID((err, eventCID) =>
              cb(err, eventCID, linkedEvent)
            )
          }

          // Publish is being created at this node, not just forwardind,
          // so add it to DHT and propagate it through our whole topic tree
          setPublishedEventStats(linkedEvent)
          store(dht, linkedEvent, cb)
        }
      ],
      (err, eventCID, linkedEvent) => {
        if (err) return callback(err)

        const topicB58Str = linkedEvent.topicCID.toBaseEncodedString()
        const rpc = createRPC.event.publish(linkedEvent)
        const trees = pulsarcastNode.me.trees.get(topicB58Str)

        // We're subscribed to this topic, emit the message
        if (pulsarcastNode.subscriptions.has(topicB58Str)) {
          log.trace('Got event %j', {
            rpc: true,
            type: 'event',
            topicName: topicNode.name,
            created: eventNode.metadata.created,
            latency: new Date() - eventNode.metadata.created,
            topic: topicB58Str,
            eventCID: eventCID.toBaseEncodedString()
          })
          setReceivedEventStats(linkedEvent)
          pulsarcastNode.emit(topicB58Str, linkedEvent)
        }
        // log.trace('Got publish %j', {
        //   rpc: true,
        //   type: 'publish',
        //   subscribed: pulsarcastNode.subscriptions.has(topicB58Str),
        //   topicName: topicNode.name,
        //   created: eventNode.metadata.created,
        //   latency: new Date() - eventNode.metadata.created,
        //   topic: topicB58Str,
        //   event: eventCID.toBaseEncodedString()
        // })

        // TODO handle publishing to an event we're not subscribed to
        if (!trees) {
          log.err(
            `No trees for topic ${topicB58Str} %j`,
            topicNode.getReadableFormat()
          )
          return callback(null, eventCID, topicNode, linkedEvent)
        }
        const { parents, children } = trees

        const peers = [...parents, ...children]
        peers.forEach(peer => {
          // Don't forward the message back
          if (peer.info.id.toB58String() !== fromIdB58Str) send(peer, rpc)
        })
        return callback(null, eventCID, topicNode, linkedEvent)
      }
    )
  }

  function requestToPublish(topicNode, eventNode, fromIdB58Str, callback) {
    const rpc = createRPC.event.requestToPublish(eventNode)

    topicNode.getCID((err, topicCID) => {
      if (err) return callback(err)

      const topicB58Str = topicCID.toBaseEncodedString()
      const trees = pulsarcastNode.me.trees.get(topicB58Str)
      // TODO handle request to an event we're not subscribed to
      if (!trees) return callback(null, topicNode, eventNode)
      const { parents, children } = trees

      const peers = [...parents, ...children]
      peers.forEach(peer => {
        // Don't forward the message back
        if (peer.info.id.toB58String() !== fromIdB58Str) send(peer, rpc)
      })
      return callback(null, topicNode, eventNode)
    })
  }

  // Join finds the closest peer to the topic CID
  // and sends the rpc join message
  function joinTopic(topicNode, callback) {
    const { me } = pulsarcastNode
    topicNode.getCID((err, topicCID) => {
      if (err) return callback(err)

      const rpc = createRPC.topic.join(topicCID)
      // Get the closest peer to the topic author stored locally
      waterfall(
        [
          closestPeerToPeer.bind(null, dht, topicNode.author),
          pulsarcastNode._getPeer.bind(pulsarcastNode)
        ],
        (err, peer) => {
          if (err) return callback(err)
          // Add peer to my tree
          me.addParents(topicCID.toBaseEncodedString(), [peer])
          // Add me to peer's tree
          peer.addChildren(topicCID.toBaseEncodedString(), [me])
          send(peer, rpc)

          callback(null, topicNode)
        }
      )
    })
  }

  function leaveTopic(topicNode, toPeer, callback) {
    topicNode.getCID((err, topicCID) => {
      if (err) return callback(err)

      const rpc = createRPC.topic.leave(topicCID)
      send(toPeer, rpc)
      callback()
    })
  }

  function newTopic(topicNode, callback) {
    const { me, subscriptions } = pulsarcastNode

    waterfall(
      [
        // Check if the sub topics exist
        cb => {
          eachLimit(
            Object.values(topicNode.subTopics),
            20,
            (topicCid, done) => pulsarcastNode._getTopic(topicCid, done),
            cb
          )
        },
        // Get the parent topic
        cb => {
          if (!topicNode.parent) return setImmediate(cb, null, null)

          pulsarcastNode._getTopic(topicNode.parent, (err, topicNode) =>
            cb(err, topicNode)
          )
        },
        // Get the meta topic or create a new one
        (parentTopic, cb) => {
          if (parentTopic)
            return setImmediate(cb, null, parentTopic.subTopics.meta)

          const metaTopicNode = new TopicNode(
            `meta-${topicNode.name}`,
            me.info.id,
            {
              metadata: { allowedPublishers: [me.info.id] }
            }
          )

          pulsarcastNode._addTopic(
            metaTopicNode,
            (err, linkedTopic, metaTopicCID) => {
              if (err) return cb(err)

              store(dht, metaTopicNode, (err, cid) => cb(err, cid))
            }
          )
        },
        // Subscribe to the meta topic
        (metaCID, cb) => {
          pulsarcastNode.subscribe(metaCID.toBaseEncodedString(), err =>
            cb(err, metaCID)
          )
        },
        // Store the new topic
        (metaCID, cb) => {
          topicNode.subTopics.meta = metaCID

          pulsarcastNode._addTopic(topicNode, (err, topicNode, topicCID) => {
            if (err) return cb(err)

            // We created the topic, we're subscribed to it by default
            subscriptions.add(topicCID.toBaseEncodedString())
            // log.trace('Subscribing to topic %j', {
            //   command: 'subscribe',
            //   topic: topicCID.toBaseEncodedString()
            // })
            store(dht, topicNode, cb)
          })
        },
        // Publish the new topic descriptor through meta topic
        (topicCID, topicNode, cb) => {
          const metaB58Str = topicNode.subTopics.meta.toBaseEncodedString()
          waterfall(
            [
              cb => topicNode.serializeCBOR(cb),
              (serialized, cb) =>
                pulsarcastNode.publish(metaB58Str, serialized, cb)
            ],
            // Return the topicCID
            err => cb(err, topicCID)
          )
        }
      ],
      (err, cid) => callback(err, cid, topicNode)
    )
  }

  function send(peer, rpc) {
    // log.trace('Sending rpc %j', {
    //   handler: 'out',
    //   op: rpc.op,
    //   to: peer.info.id.toB58String()
    // })
    setRPCStats(rpc)

    const rpcToSend = marshalling.marshall(rpc)
    const encodedMessage = RPC.encode({ msgs: [rpcToSend] })

    peer.sendMessages(encodedMessage)
  }

  // Helper funcs
  function addEvent(topicCID, topicNode, eventNode, { createLink }, cb) {
    const topicB58Str = topicCID.toBaseEncodedString()
    const { eventTrees } = pulsarcastNode
    let eventTree

    // Add event tree if it does not exist
    if (eventTrees.has(topicB58Str)) {
      eventTree = eventTrees.get(topicB58Str)
    } else {
      eventTree = new EventTree(topicNode)
      eventTrees.set(topicB58Str, eventTree)
    }

    if (createLink) return eventTree.addNew(eventNode, cb)
    eventTree.add(eventNode, cb)
  }

  function setRPCStats(rpc) {
    pulsarcastNode._stats.rpc.out++
    if (rpc.event) {
      const topicB58Str = rpc.event.topicCID.toBaseEncodedString()
      if (!pulsarcastNode._stats.rpc.topics[topicB58Str]) {
        pulsarcastNode._stats.rpc.topics[topicB58Str] = { in: 0, out: 0 }
      }
      pulsarcastNode._stats.rpc.topics[topicB58Str].out++
    }
  }

  function setReceivedEventStats(eventNode) {
    pulsarcastNode._stats.events.received++
    const topicB58Str = eventNode.topicCID.toBaseEncodedString()
    if (!pulsarcastNode._stats.events.topics[topicB58Str]) {
      pulsarcastNode._stats.events.topics[topicB58Str] = {
        received: 0,
        published: 0
      }
    }
    pulsarcastNode._stats.events.topics[topicB58Str].received++
  }

  function setPublishedEventStats(eventNode) {
    pulsarcastNode._stats.events.published++
    const topicB58Str = eventNode.topicCID.toBaseEncodedString()
    if (!pulsarcastNode._stats.events.topics[topicB58Str]) {
      pulsarcastNode._stats.events.topics[topicB58Str] = {
        received: 0,
        published: 0
      }
    }
    pulsarcastNode._stats.events.topics[topicB58Str].published++
  }

  // function getEvent (topicCID, eventCID) {
  //   const topicB58Str = topicCID.toBaseEncodedString()
  //   const {eventTrees} = pulsarcastNode
  //   const eventTree = eventTrees.get(topicB58Str)
  //   return eventTree.get(eventCID)
  // }
}

module.exports = createRPCHandlers
