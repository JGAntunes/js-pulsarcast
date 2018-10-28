'use strict'

const Joi = require('joi-browser')

const peerTree = Joi.object().keys({
  topic: Joi.binary().required(),
  parents: Joi.array().items(Joi.binary()).required(),
  children: Joi.array().items(Joi.binary()).required()
})

module.exports = peerTree
