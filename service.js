// Copyright (c) 2018, Brandon Lehmann, The TurtleCoin Developers
//
// Please see the included LICENSE file for more information.

'use strict'

const TurtleCoind = require('./')
const util = require('util')

var daemon = new TurtleCoind({
  loadCheckpoints: './checkpoints.csv',
  priorityNodes: [
    '159.65.137.156:11897',
    '159.65.131.182:11897',
    '159.65.131.222:11897',
    '167.99.47.137:11897',
    '167.99.47.174:11897',
    '167.99.32.75:11897',
    '165.227.194.76:11897',
    '165.227.199.84:11897',
    '198.199.66.14:11897',
    '167.99.101.97:11897',
    '167.99.103.93:11897',
    '167.99.169.150:11897',
    '165.227.252.132:11897'
  ],
  feeAddress: 'TRTLv1pacKFJk9QgSmzk2LJWn14JGmTKzReFLz1RgY3K9Ryn7783RDT2TretzfYdck5GMCGzXTuwKfePWQYViNs4avKpnUbrwfQ',
  feeAmount: 350000,
  dbReadCacheSize: 1000,
  maxPollingFailures: 10
  // Load additional daemon parameters here
})

function log (message) {
  console.log(util.format('%s: %s', (new Date()).toUTCString(), message))
}

daemon.on('start', (args) => {
  log(util.format('TurtleCoind has started... %s', args))
})

daemon.on('started', () => {
  log('TurtleCoind is attempting to synchronize with the network...')
})

daemon.on('syncing', (info) => {
  log(util.format('TurtleCoind has syncronized %s out of %s blocks [%s%]', info.height, info.network_height, info.percent))
})

daemon.on('synced', () => {
  log('TurtleCoind is synchronized with the network...')
})

daemon.on('ready', (info) => {
  log(util.format('TurtleCoind is waiting for connections at %s @ %s - %s H/s', info.height, info.difficulty, info.globalHashRate))
})

daemon.on('desync', (daemon, network, deviance) => {
  log(util.format('TurtleCoind is currently off the blockchain by %s blocks. Network: %s  Daemon: %s', deviance, network, daemon))
})

daemon.on('down', () => {
  log('TurtleCoind is not responding... stopping process...')
  daemon.stop()
})

daemon.on('stopped', (exitcode) => {
  log(util.format('TurtleCoind has closed (exitcode: %s)... restarting process...', exitcode))
  daemon.start()
})

daemon.on('info', (info) => {
  log(info)
})

daemon.on('error', (err) => {
  log(err)
})

daemon.start()
