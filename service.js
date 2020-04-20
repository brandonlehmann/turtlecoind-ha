// Copyright (c) 2018-2019, Brandon Lehmann, The TurtleCoin Developers
//
// Please see the included LICENSE file for more information.

'use strict'

const TurtleCoind = require('./')
const util = require('util')

const metrics = []
try {
  const pm2Metrics = require('@pm2/io')

  log('@pm2/io module installed, enabling custom metrics...')

  const metricSet = [
    { name: 'Status', unit: false },
    { name: 'Progress', unit: 'percent' },
    { name: 'Blockheight', unit: 'blocks' },
    { name: 'Net hash', unit: 'h/s' },
    { name: 'Difficulty', unit: false }
  ]

  metricSet.forEach((metric) => {
    metrics.push(pm2Metrics.metric({
      name: metric.name,
      unit: metric.unit
    }))
  })
} catch (error) {
  log('@pm2/io module not installed, ignoring...')
}

var daemon = new TurtleCoind({
  loadCheckpoints: './checkpoints.csv',
  priorityNodes: [
    '165.227.252.132:11897',
    '167.99.218.19:11897',
    '167.99.210.184:11897',
    '167.99.210.238:11897',
    '68.183.121.235:11897',
    '68.183.121.246:11897',
    '68.183.121.249:11897',
    '159.65.111.15:11897',
    '159.65.107.117:11897',
    '165.227.1.135:11897',
    '209.97.173.21:11897',
    '178.128.208.46:11897',
    '209.97.170.204:11897'
  ],
  feeAddress: 'TRTLv1pacKFJk9QgSmzk2LJWn14JGmTKzReFLz1RgY3K9Ryn7783RDT2TretzfYdck5GMCGzXTuwKfePWQYViNs4avKpnUbrwfQ',
  feeAmount: 400000,
  dbReadCacheSize: 500,
  maxPollingFailures: 10
  // Load additional daemon parameters here
})

function log (message) {
  console.log(util.format('%s: %s', (new Date()).toUTCString(), message))
}

function resetMetrics (metrics) {
  metrics.forEach((metric) => {
    metric.set(undefined)
  })
}

daemon.on('start', (args) => {
  log(util.format('TurtleCoind has started... %s', args))
  if (metrics.length !== 0) {
    resetMetrics(metrics)
    metrics[0].set('starting')
  }
})

daemon.on('started', () => {
  log('TurtleCoind is attempting to synchronize with the network...')
  if (metrics.length !== 0) {
    resetMetrics(metrics)
    metrics[0].set('started')
  }
})

daemon.on('syncing', (info) => {
  log(util.format('TurtleCoind has synchronized %s out of %s blocks [%s%]', info.height, info.network_height, info.percent))
  if (metrics.length !== 0) {
    resetMetrics(metrics)
    metrics[0].set('synchronizing')
    metrics[1].set(`${info.height}/${info.network_height} (${info.percent}%)`)
  }
})

daemon.on('synced', () => {
  log('TurtleCoind is synchronized with the network...')
  if (metrics.length !== 0) {
    resetMetrics(metrics)
    metrics[0].set('synchronized')
  }
})

daemon.on('ready', (info) => {
  log(util.format('TurtleCoind is waiting for connections at %s @ %s - %s H/s', info.height, info.difficulty, info.globalHashRate))
  if (metrics.length !== 0) {
    metrics[0].set('waiting for connections')
    metrics[2].set(info.height)
    metrics[3].set(info.globalHashRate)
    metrics[4].set(info.difficulty)
  }
})

daemon.on('desync', (daemon, network, deviance) => {
  log(util.format('TurtleCoind is currently off the blockchain by %s blocks. Network: %s  Daemon: %s', deviance, network, daemon))
  if (metrics.length !== 0) {
    resetMetrics(metrics)
    metrics[0].set('desynchronized')
    metrics[1].set(`${daemon}/${network}`)
  }
})

daemon.on('down', () => {
  log('TurtleCoind is not responding... stopping process...')
  if (metrics.length !== 0) {
    resetMetrics(metrics)
    metrics[0].set('down')
  }
  daemon.stop()
})

daemon.on('stopped', (exitcode) => {
  log(util.format('TurtleCoind has closed (exitcode: %s)... restarting process...', exitcode))
  if (metrics.length !== 0) {
    resetMetrics(metrics)
    metrics[0].set(`stopped (code: ${exitcode})`)
  }
  daemon.start()
})

daemon.on('info', (info) => {
  log(info)
})

daemon.on('error', (err) => {
  log(err)
})

daemon.start()
