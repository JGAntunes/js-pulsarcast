'use strict'

const EventEmitter = require('events')
const assert = require('assert')

// const log = require('utils/logger')

class RPCHandler extends EventEmitter {
  constructor (libp2p) {
    super()

    this.libp2p = libp2p

    this._onConnection = this._onConnection.bind(this)
    this._dialPeer = this._dialPeer.bind(this)
  }

  _onRPC (rpc) {

  }
}

module.exports = RPCHandler
