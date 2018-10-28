'use strict'

const protons = require('protons')

const messages = protons(require('./messages.proto'))

module.exports = messages
