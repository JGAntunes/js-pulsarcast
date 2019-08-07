'use strict'

const Joi = require('joi')

const metadata = Joi.object()
  .keys({
    created: Joi.date()
      .iso()
      .required(),
    protocolVersion: Joi.string().required()
    // signature: Joi.binary()
  })
  .required()

const eventDescriptor = Joi.object().keys({
  publisher: Joi.binary()
    .required()
    .allow(null),
  author: Joi.binary().required(),
  parent: Joi.object()
    .keys({
      '/': Joi.binary().allow(null)
    })
    .required(),
  payload: Joi.binary().required(),
  topic: Joi.object()
    .keys({
      '/': Joi.binary().required()
    })
    .required(),
  metadata
})

module.exports = eventDescriptor
