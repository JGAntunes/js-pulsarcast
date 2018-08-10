'use strict'

// const log = require('../utils/logger')
// const ops = require('../messages').rpc.RPC.Operation

function createRPCHandlers (pulsarcastNode) {
  return {
    event,
    update,
    join,
    leave
  }

  function event (message) {
    // log.trace(`Sending event to  ${idB58Str}`)
  }

  function update (message) {
    // log.trace(`Sending update to  ${idB58Str}`)
  }

  function join (message) {
    // log.trace(`Sending join to  ${idB58Str}`)
  }

  function leave (message) {
    // log.trace(`Sending leave to  ${idB58Str}`)
  }
}

module.exports = createRPCHandlers
