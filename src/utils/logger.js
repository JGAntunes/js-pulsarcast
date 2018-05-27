'use strict'

const debug = require('debug')

const log = debug('libp2p:pulsarcast')
log.error = log.err = debug('libp2p:pulsarcast:error')

module.exports = log
