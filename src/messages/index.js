'use strict'

const protons = require('protons')

const rpc = protons(require('./rpc.proto'))
const topic = protons(require('./topic.proto'))
const schemas = require('./schemas')

module.exports = {
  rpc,
  topic,
  schemas
}
