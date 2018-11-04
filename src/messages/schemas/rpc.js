'use strict'

const Joi = require('joi-browser')
const topicDescriptor = require('./topic-descriptor')
const eventDescriptor = require('./event-descriptor')
const peerTree = require('./peer-tree')
const ops = require('../protobuffers').RPC.Operation

const metadata = Joi.object().keys({
  created: Joi.date().iso(),
  protocolVersion: Joi.string()
}).required()

const rpc = Joi.object().keys({
  op: Joi.number().integer().valid(Object.values(ops)).required(),
  metadata,
  topicId: Joi.binary(),
  event: eventDescriptor,
  topic: topicDescriptor,
  peerTree: peerTree
}).required()

module.exports = rpc
