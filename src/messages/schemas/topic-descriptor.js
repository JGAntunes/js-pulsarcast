'use strict'

const Joi = require('joi')
const eventLinking = require('../protobuffers').TopicDescriptor.MetaData
  .EventLinking

const metadata = Joi.object()
  .keys({
    created: Joi.date()
      .iso()
      .required(),
    protocolVersion: Joi.string().required(),
    allowedPublishers: Joi.object()
      .keys({
        enabled: Joi.boolean(),
        peers: Joi.alternatives().when('enabled', {
          is: true,
          then: Joi.array()
            .items(Joi.binary())
            .min(1)
        })
      })
      .required(),
    requestToPublish: Joi.object()
      .keys({
        enabled: Joi.boolean(),
        peers: Joi.array().items(Joi.binary())
      })
      .required(),
    eventLinking: Joi.string()
      .valid(Object.values(eventLinking))
      .required()
    // signature: Joi.binary()
  })
  .required()

const topicDescriptor = Joi.object().keys({
  name: Joi.string().required(),
  author: Joi.binary().required(),
  parent: Joi.object()
    .keys({
      '/': Joi.binary()
    })
    .required(),
  '#': Joi.object()
    .pattern(
      Joi.string(),
      Joi.object().keys({
        '/': Joi.binary().required()
      })
    )
    .required(),
  metadata
})

module.exports = topicDescriptor
