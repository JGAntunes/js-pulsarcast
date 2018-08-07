'use strict'

const debug = require('debug')

const log = debug('libp2p:pulsarcast')
log.error = log.err = debug('libp2p:pulsarcast:error')
log.info = debug('libp2p:pulsarcast:info')
log.debug = debug('libp2p:pulsarcast:debug')
log.trace = debug('libp2p:pulsarcast:trace')

module.exports = log
