'use strict'

const protons = require('protons')

const rpc = protons(require('./rpc.proto.js'))
const topic = protons(require('./topic.proto.js'))

module.exports = {
  rpc,
  topic
}
