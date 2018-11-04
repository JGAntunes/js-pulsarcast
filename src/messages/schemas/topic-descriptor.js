'use strict'

const Joi = require('joi-browser')

const metadata = Joi.object().keys({
  created: Joi.date().iso().required(),
  protocolVersion: Joi.string().required()
}).required()

const topicDescriptor = Joi.object().keys({
  name: Joi.string().required(),
  author: Joi.binary().required(),
  parent: Joi.object().keys({
    '/': Joi.binary()
  }).required(),
  '#': Joi.object().pattern(Joi.string(), Joi.object().keys({
    '/': Joi.binary().required()
  })).required(),
  metadata
})

module.exports = topicDescriptor
