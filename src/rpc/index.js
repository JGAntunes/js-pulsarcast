'use strict'

const send = require('./send')
const receive = require('./receive')

module.exports = rpc

function rpc (pulsarcastNode) {
  return {
    send: send(pulsarcastNode),
    receive: receive(pulsarcastNode)
  }
}
