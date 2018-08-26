'use strict'

const { createRPC, marshalling } = require('../messages')
const log = require('../utils/logger')
// const ops = require('../messages').rpc.RPC.Operation

function createRPCHandlers (pulsarcastNode) {
  const dht = pulsarcastNode.libp2p.dht

  return {
    join,
    event,
    leave
  }

  // Join finds the closest peer to the topic CID
  // and sends the rpc join message
  function join (topic) {
    const rpc = createRPC.join(topic)

    // Get the closest peer stored locally
    const closestPeerId = dht.routingTable.closestPeer(topic, 1)
    send(closestPeerId.toB58Str(), rpc)
  }

  function event (topic, event, fromIdB58Str) {
    const { parents, children } = pulsarcastNode.me.trees.get(topic)
    const rpc = createRPC.event(topic, event)
    // RPC message is being created at this node, not just forwardind,
    // so propagate it through our whole topic tree
    if (!fromIdB58Str) {
      parents.forEach(parent => send(parent.info.id.toB58Str(), rpc))
      children.forEach(child => send(child.info.id.toB58Str(), rpc))
      return
    }

    // Need to check where to forward the message
    if (parents.find(peer => peer.info.id.toB58String() === fromIdB58Str)) {
      // Need to forward the message to our children
      parents.forEach(parent => send(parent.info.id.toB58Str(), rpc))
    }

    if (children.find(peer => peer.info.id.toB58String() === fromIdB58Str)) {
      // Need to forward the message to our parents
      children.forEach(child => send(child.info.id.toB58Str(), rpc))
    }
  }

  function leave (topic) {
    // TODO
  }

  function send (idB58Str, rpc) {
    log.trace(`Sending event to ${idB58Str}`)

    const rpcToSend = marshalling.marshall(rpc)
    const peer = pulsarcastNode.peers.get(idB58Str)
    peer.sendMessages([rpcToSend])
  }
}

module.exports = createRPCHandlers
