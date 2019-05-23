// Copyright (c) 2018, Brandon Lehmann, The TurtleCoin Developers
//
// Please see the included LICENSE file for more information.

'use strict'

const TurtleCoind = require('./')
const util = require('util')


let metrics = []
try {
  const pm2Metrics = require('@pm2/io')
  log('@pm2/io module installed, enabling custom metrics...')
  for (let [ name, unit ]  of [ [ "Status", false ], [ "Progress", "percent"], [ "Blockheight", "blocks" ], [ "Net hash", "h/s" ], [ "Difficulty", false ] ]) {
    metrics.push(pm2Metrics.metric({
      name: name,
      unit: unit,
    }))
  }
} catch (error) {
  log('@pm2/io module not installed, ignoring...')
}

var daemon = new TurtleCoind({
  loadCheckpoints: './checkpoints.csv'
  // Load additional daemon parameters here
})

function log (message) {
  console.log(util.format('%s: %s', (new Date()).toUTCString(), message))
}

function resetMetrics(metrics) {
  for (let metric of metrics) {
    metric.set(undefined)
  }
}

daemon.on('start', (args) => {
  log(util.format('TurtleCoind has started... %s', args))
  if (metrics != undefined && metrics.length !== 0) {
    resetMetrics(metrics)
    metrics[0].set('starting');
  }
})

daemon.on('started', () => {
  log('TurtleCoind is attempting to synchronize with the network...')
  if (metrics != undefined && metrics.length !== 0) {
    resetMetrics(metrics)
    metrics[0].set('started');
  }
})

daemon.on('syncing', (info) => {
  log(util.format('TurtleCoind has synchronized %s out of %s blocks [%s%]', info.height, info.network_height, info.percent))
  if (metrics != undefined && metrics.length !== 0) {
    resetMetrics(metrics)
    metrics[0].set('synchronizing')
    metrics[1].set(`${info.height}/${info.network_height} (${info.percent}%)`)
  }
})

daemon.on('synced', () => {
  log('TurtleCoind is synchronized with the network...')
  if (metrics != undefined && metrics.length !== 0) {
    resetMetrics(metrics)
    metrics[0].set('synchronized')
  }
})

daemon.on('ready', (info) => {
  log(util.format('TurtleCoind is waiting for connections at %s @ %s - %s H/s', info.height, info.difficulty, info.globalHashRate))
  if (metrics != undefined && metrics.length !== 0) {
    metrics[0].set('waiting for connections')
    metrics[2].set(info.height)
    metrics[3].set(info.globalHashRate)
    metrics[4].set(info.difficulty)
  }
})

daemon.on('desync', (daemon, network, deviance) => {
  log(util.format('TurtleCoind is currently off the blockchain by %s blocks. Network: %s  Daemon: %s', deviance, network, daemon))
  if (metrics != undefined && metrics.length !== 0) {
    resetMetrics(metrics)
    metrics[0].set('desynchronized')
    metrics[1].set(`${info.daemon}/${info.network}`)
  }
})

daemon.on('down', () => {
  log('TurtleCoind is not responding... stopping process...')
  if (metrics != undefined && metrics.length !== 0) {
    resetMetrics(metrics)
    metrics[0].set('down')
  }
  daemon.stop()
})

daemon.on('stopped', (exitcode) => {
  log(util.format('TurtleCoind has closed (exitcode: %s)... restarting process...', exitcode))
  if (metrics != undefined && metrics.length !== 0) {
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
