'use strict'

const Joi = require('joi-browser')
const ops = require('../messages').rpc.RPC.Operation

const metadata = Joi.object.keys({
  created: Joi.date().iso(),
  protocolVersion: Joi.string()
}).required()

const event = Joi.object().keys({
  publisher: Joi.binary().required(),
  parent: Joi.binary().required(),
  payload: Joi.binary().required(),
  metadata
})

const peerTree = Joi.object().keys({
  parents: Joi.array().items(Joi.binary()).required(),
  children: Joi.array().items(Joi.binary()).required()
})

const rpc = Joi.object().keys({
  op: Joi.number().integer().valid(Object.values(ops)).required(),
  topic: Joi.binary().required(),
  event,
  metadata,
  peerTree
}).required()

module.exports = rpc
