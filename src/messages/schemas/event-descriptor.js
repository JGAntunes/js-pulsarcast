'use strict'

const Joi = require('joi-browser')

const metadata = Joi.object().keys({
  created: Joi.date().iso(),
  protocolVersion: Joi.string()
}).required()

const eventDescriptor = Joi.object().keys({
  publisher: Joi.binary().required(),
  parent: Joi.object().keys({
    '/': Joi.binary()
  }).required(),
  payload: Joi.binary().required(),
  topic: Joi.object().keys({
    '/': Joi.binary().required()
  }).required(),
  metadata
})

module.exports = eventDescriptor
