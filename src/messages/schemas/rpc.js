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

const rpc = Joi.object().keys({
  op: Joi.number().integer().valid(Object.values(ops)).required(),
  topic: Joi.binary().required(),
  event
}).required()

module.exports = rpc
