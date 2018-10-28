'use strict'

const Joi = require('joi-browser')

const metadata = Joi.object.keys({
  created: Joi.date().iso(),
  protocolVersion: Joi.string()
}).required()

const eventDescriptor = Joi.object().keys({
  publisher: Joi.binary().required(),
  parent: Joi.binary().required(),
  payload: Joi.binary().required(),
  topic: Joi.binary().required(),
  metadata
})

module.exports = eventDescriptor
