'use strict'

// const log = require('utils/logger')
const ops = require('../messages').rpc.RPC.Operation

function createRPCHandlers (pulsarcastNode) {
  return {
    event,
    update,
    join,
    leave,
    genericHandler
  }

  function event (idB58Str, message) {

  }

  function update (idB58Str, message) {

  }

  function join (idB58Str, message) {

  }

  function leave (idB58Str, message) {

  }

  function genericHandler (idB58Str, message) {
    // TODO perform generic validation here
    switch (message.op) {
      // case ops.PING:
      //   return ping(idB58Str, message)
      case ops.UPDATE:
        return update(idB58Str, message)
      case ops.EVENT:
        return event(idB58Str, message)
      case ops.JOIN:
        return join(idB58Str, message)
      case ops.LEAVE:
        return leave(idB58Str, message)
    }
  }
}

module.exports = createRPCHandlers
