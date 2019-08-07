'use strict'

const TCP = require('libp2p-tcp')
const spdy = require('libp2p-spdy')
const secio = require('libp2p-secio')
const DHT = require('libp2p-kad-dht')
const libp2p = require('libp2p')

class Node extends libp2p {
  constructor({ peerInfo, peerBook }) {
    const modules = {
      transport: [TCP],
      streamMuxer: [spdy],
      connEncryption: [secio],
      dht: DHT
    }

    const config = {
      // Disable other discovery mechanisms
      peerDiscovery: {
        mdns: {
          enabled: false
        },
        webrtcStar: {
          enabled: false
        }
      },
      dht: {
        kBucketSize: 4,
        enabledDiscovery: false
      },
      EXPERIMENTAL: {
        dht: true
      }
    }

    const connectionManager = {
      // TODO we might need to limit pulsarcast connections
      // maxPeers: 3
    }

    super({
      connectionManager,
      modules,
      peerInfo,
      config,
      peerBook
    })
  }
}

module.exports = Node
