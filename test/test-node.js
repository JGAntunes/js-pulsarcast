'use strict'

const TCP = require('libp2p-tcp')
const spdy = require('libp2p-spdy')
const secio = require('libp2p-secio')
const DHT = require('libp2p-kad-dht')
const libp2p = require('libp2p')

class Node extends libp2p {
  constructor ({ peerInfo, peerBook }) {
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
      EXPERIMENTAL: {
        dht: true
      }
    }

    super({
      modules,
      peerInfo,
      config,
      peerBook
    })
  }
}

module.exports = Node
