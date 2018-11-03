// Copyright (c) 2018, Brandon Lehmann, The TurtleCoin Developers
//
// Please see the included LICENSE file for more information.

'use strict'

const TurtleCoindRPC = require('turtlecoin-rpc').TurtleCoind
const WebSocket = require('./lib/websocket.js')
const pty = require('node-pty')
const util = require('util')
const inherits = require('util').inherits
const EventEmitter = require('events').EventEmitter
const fs = require('fs')
const path = require('path')
const os = require('os')
const shelljs = require('shelljs')
const nonce = require('nonce')()

const daemonResponses = {
  started: 'P2p server initialized OK',
  help: 'Show this help',
  block: 'New Top Block Detected:'
}
const blockTargetTime = 30

const TurtleCoind = function (opts) {
  opts = opts || {}
  if (!(this instanceof TurtleCoind)) return new TurtleCoind(opts)

  /*
    This is NOT where you set your options at. If you're changing
    values here, you're doing it wrong. These are the default values
    used if you don't specify them when you create the object.
  */
  this.pollingInterval = opts.pollingInterval || 10000
  this.maxPollingFailures = opts.maxPollingFailures || 6
  this.checkHeight = opts.checkHeight || true
  this.maxDeviance = opts.maxDeviance || 5
  this.clearP2pOnStart = opts.clearP2pOnStart || true
  this.clearDBLockFile = opts.clearDBLockFile || true
  this.timeout = opts.timeout || 2000
  this.enableWebSocket = opts.enableWebSocket || true
  this.webSocketPassword = opts.webSocketPassword || false

  // Begin TurtleCoind options
  this.path = opts.path || path.resolve(__dirname, './TurtleCoind' + ((os.platform() === 'win32') ? '.exe' : ''))
  this.dataDir = opts.dataDir || path.resolve(os.homedir(), './.TurtleCoin')
  this.logFile = opts.logFile || path.resolve(__dirname, './TurtleCoind.log')
  this.logLevel = opts.logLevel || 2
  this.testnet = opts.testnet || false
  this.enableCors = opts.enableCors || false
  this.enableBlockExplorer = opts.enableBlockExplorer || true
  this.loadCheckpoints = opts.loadCheckpoints || false
  this.rpcBindIp = opts.rpcBindIp || '0.0.0.0'
  this.rpcBindPort = opts.rpcBindPort || 11898
  this.p2pBindIp = opts.p2pBindIp || false
  this.p2pBindPort = opts.p2pBindPort || false
  this.p2pExternalPort = opts.p2pExternalPort || false
  this.allowLocalIp = opts.allowLocalIp || false
  this.peers = opts.peers || false
  this.priorityNodes = opts.priorityNodes || false
  this.exclusiveNodes = opts.exclusiveNodes || false
  this.seedNode = opts.seedNode || false
  this.hideMyPort = opts.hideMyPort || false
  this.dbThreads = opts.dbThreads || false
  this.dbMaxOpenFiles = opts.dbMaxOpenFiles || false
  this.dbWriteBufferSize = opts.dbWriteBufferSize || false
  this.dbReadCacheSize = opts.dbReadCacheSize || false
  this.feeAddress = opts.feeAddress || false
  this.feeAmount = opts.feeAmount || 0

  // starting sanity checks
  this._rpcQueryIp = (this.rpcBindIp === '0.0.0.0') ? '127.0.0.1' : this.rpcBindIp

  // make sure our paths make sense
  if (this.loadCheckpoints) {
    this.loadCheckpoints = fixPath(this.loadCheckpoints)
  }
  this.path = fixPath(this.path)
  this.dataDir = fixPath(this.dataDir)

  this.once('start', () => {
    this._setupWebSocket()
    this._setupAPI()
  })

  this.on('started', () => {
    this.syncWatchIntervalPtr = setInterval(() => {
      this.api.getHeight().then((result) => {
        var percent = precisionRound(((result.height / result.network_height) * 100), 2)
        if (result.height > result.network_height) { // when we know more than what the network is reporting, we can't be at 100%
          percent = 99
        } else {
          if (percent > 100) percent = 100
        }
        this.emit('syncing', {height: result.height, network_height: result.network_height, percent: percent})
        if (result.height === result.network_height && result.height > 1) {
          this._checkServices()
          this.synced = true
          this.emit('synced')
        }
      }).catch((err) => {
        this.emit('warning', err)
      })
    }, this.pollingInterval)
  })

  this.on('synced', () => {
    if (this.syncWatchIntervalPtr) {
      clearInterval(this.syncWatchIntervalPtr)
      delete this.syncWatchIntervalPtr
    }
  })

  this.on('topblock', (height) => {
    if (this.synced) {
      this.api.getLastBlockHeader().then((block) => {
        return this.api.getBlock({
          hash: block.hash
        })
      }).then((block) => {
        this.emit('block', block)
      }).catch((err) => {
        this.emit('error', err)
      })
    }
  })
}
inherits(TurtleCoind, EventEmitter)

TurtleCoind.prototype.start = function () {
  var databaseLockfile = path.resolve(util.format('%s/DB/LOCK', this.dataDir))
  if (fs.existsSync(databaseLockfile)) {
    this.emit('error', 'Database LOCK file exists...')
    if (this.clearDBLockFile) {
      try {
        fs.unlinkSync(databaseLockfile)
        this.emit('info', util.format('Deleted the DB LOCK File at: %s', databaseLockfile))
        setTimeout(() => {
          this.start()
        }, 5000)
        return false
      } catch (e) {
        this.emit('error', util.format('Could not delete the DB LOCK File at: %s', databaseLockfile, e))
        setTimeout(() => {
          this.start()
        }, 5000)
        return false
      }
    } else {
      setTimeout(() => {
        this.start()
      }, 5000)
      return false
    }
  }
  this.emit('info', 'Attempting to start turtlecoind-ha...')
  if (!fs.existsSync(this.path)) {
    this.emit('error', '************************************************')
    this.emit('error', util.format('%s could not be found', this.path))
    this.emit('error', 'HALTING THE SERVICE DUE TO ERROR')
    this.emit('error', '************************************************')
    return false
  }
  if (!fs.existsSync(this.dataDir)) {
    this.emit('info', '************************************************')
    this.emit('info', util.format('%s could not be found', this.dataDir))
    this.emit('info', 'It is highly recommended that you bootstrap the blockchain before utilizing this service.')
    this.emit('info', 'You will be waiting a while for the service to reported as running correctly without bootstrapping.')
    this.emit('info', '************************************************')
    try {
      shelljs.mkdir('-p', this.dataDir)
    } catch (e) {
      this.emit('error', util.format('Could not create blockchain directory %s: %s', this.dataDir, e))
      return false
    }
  }
  if (this.clearP2pOnStart) {
    var p2pfile = path.resolve(util.format('%s/p2pstate.bin', this.dataDir))
    if (fs.existsSync(p2pfile)) {
      try {
        fs.unlinkSync(p2pfile)
        this.emit('info', util.format('Deleted the P2P State File at: %s', p2pfile))
      } catch (e) {
        this.emit('error', util.format('Could not delete the P2P State File at: %s', p2pfile, e))
      }
    }
  }
  this.synced = false
  this.firstCheckPassed = false

  var args = this._buildargs()
  this.child = pty.spawn(this.path, args, {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: process.env.HOME,
    env: process.env
  })

  this.child.on('error', (error) => {
    this.emit('error', util.format('Error in child process...: %s', error))
    // When an error is encountered in the child, we need to emit a down event to make sure that we know when to restart.
    this.emit('down')
  })
  this.child.on('data', (data) => {
    data = data.trim()
    data = data.split('\r\n')
    for (var i = 0; i < data.length; i++) {
      this._checkChildStdio(data[i])
      this.emit('data', data[i])
    }
  })

  this.child.on('close', (exitcode) => {
    // as crazy as this sounds, we need to pause a moment before bubbling up the stopped event
    setTimeout(() => {
      this.emit('stopped', exitcode)
    }, 2000)
  })

  this.emit('start', util.format('%s%s', this.path, args.join(' ')))
}

TurtleCoind.prototype.stop = function () {
  // If we are currently running our checks, it's a good idea to stop them before we go kill the child process
  if (this.checkDaemon) {
    clearInterval(this.checkDaemon)
    this.checkDaemon = null
  }
  this.synced = false

  // Let's try to exit cleanly and if not, kill the process
  if (this.child) this.write('exit')
  setTimeout(() => {
    if (this.child) this.child.kill()
  }, (this.timeout * 2))
}

TurtleCoind.prototype.write = function (data) {
  this._write(util.format('%s\r', data))
}

TurtleCoind.prototype._checkChildStdio = function (data) {
  if (data.indexOf(daemonResponses.started) !== -1) {
    this.emit('started')
  } else if (data.indexOf(daemonResponses.help) !== -1) {
    this.help = true
  } else if (data.indexOf(daemonResponses.block) !== -1) {
    try {
      data = data.split(daemonResponses.block)
      data = parseInt(data[1].trim())
      this.emit('topblock', data)
    } catch (err) {
      this.emit('error', err)
    }
  }
}

TurtleCoind.prototype._triggerDown = function () {
  if (!this.firstCheckPassed) return
  if (!this.trigger) {
    this.trigger = setTimeout(() => {
      this.emit('down')
    }, (this.pollingInterval * this.maxPollingFailures))
  }
}

TurtleCoind.prototype._triggerUp = function () {
  if (!this.firstCheckPassed) this.firstCheckPassed = true
  if (this.trigger) {
    clearTimeout(this.trigger)
    this.trigger = null
  }
}

TurtleCoind.prototype._checkServices = function () {
  if (!this.synced) {
    this.synced = true
    this.checkDaemon = setInterval(() => {
      Promise.all([
        this._checkRpc(),
        this._checkDaemon()
      ]).then((results) => {
        var info = results[0][0]
        info.globalHashRate = Math.round(info.difficulty / blockTargetTime)
        if (this.checkHeight) {
          var rpcHeight = results[0][1]
          var deviance = Math.abs(rpcHeight.network_height - rpcHeight.height)
          if (deviance > this.maxDeviance) {
            this.emit('desync', rpcHeight.height, rpcHeight.network_height, deviance)
            this._triggerDown()
          } else {
            this._triggerUp()
            this.emit('ready', info)
          }
        } else {
          this._triggerUp()
          this.emit('ready', info)
        }
      }).catch((err) => {
        this.emit('error', err)
        this._triggerDown()
      })
    }, this.pollingInterval)
  }
}

TurtleCoind.prototype._checkRpc = function () {
  return new Promise((resolve, reject) => {
    Promise.all([
      this.api.getInfo(),
      this.api.getHeight()
    ]).then((results) => {
      if (results[0].height === results[1].height && results[0].status === results[1].status) {
        return resolve(results)
      } else {
        return reject(new Error('Daemon is returning inconsistent results'))
      }
    }).catch((err) => {
      return reject(util.format('Daemon is not passing checks...: %s', err))
    })
  })
}

TurtleCoind.prototype._checkDaemon = function () {
  return new Promise((resolve, reject) => {
    this.help = false
    this.write('help')
    setTimeout(() => {
      if (this.help) return resolve(true)
      return reject(new Error('Daemon is unresponsive'))
    }, 1000)
  })
}

TurtleCoind.prototype._write = function (data) {
  this.child.write(data)
}

TurtleCoind.prototype._buildargs = function () {
  var args = ''
  if (this.dataDir) args = util.format('%s --data-dir %s', args, this.dataDir)
  if (this.logFile) args = util.format('%s --log-file %s', args, this.logFile)
  if (this.logLevel) args = util.format('%s --log-level %s', args, this.logLevel)
  if (this.testnet) args = util.format('%s --testnet', args)
  if (this.enableCors) args = util.format('%s --enable-cors %s', args, this.enableCors)
  if (this.enableBlockExplorer) args = util.format('%s --enable-blockexplorer', args)
  if (this.loadCheckpoints) {
    if (fs.existsSync(path.resolve(this.loadCheckpoints))) {
      args = util.format('%s --load-checkpoints %s', args, path.resolve(this.loadCheckpoints))
    }
  }
  if (this.rpcBindIp) args = util.format('%s --rpc-bind-ip %s', args, this.rpcBindIp)
  if (this.rpcBindPort) args = util.format('%s --rpc-bind-port %s', args, this.rpcBindPort)
  if (this.p2pBindIp) args = util.format('%s --p2p-bind-ip %s', args, this.p2pBindIp)
  if (this.p2pBindPort) args = util.format('%s --p2p-bind-port %s', args, this.p2pBindPort)
  if (this.p2pExternalPort) args = util.format('%s --p2p-external-port %s', args, this.p2pExternalPort)
  if (this.allowLocalIp) args = util.format('%s --allow-local-ip', args)
  if (Array.isArray(this.peers)) {
    this.peers.forEach((peer) => {
      args = util.format('%s --add-peer %s', args, peer)
    })
  } else if (this.peers) {
    args = util.format('%s --add-peer %s', args, this.peers)
  }
  if (Array.isArray(this.priorityNodes)) {
    this.priorityNodes.forEach((peer) => {
      args = util.format('%s --add-priority-node %s', args, peer)
    })
  } else if (this.priorityNodes) {
    args = util.format('%s --add-priority-node %s', args, this.priorityNodes)
  }
  if (Array.isArray(this.exclusiveNodes)) {
    this.exclusiveNodes.forEach((peer) => {
      args = util.format('%s --add-exclusive-node %s', args, peer)
    })
  } else if (this.exclusiveNodes) {
    args = util.format('%s --add-exclusive-node %s', args, this.exclusiveNodes)
  }
  if (this.seedNode) args = util.format('%s --seed-node %s', args, this.seednode)
  if (this.hideMyPort) args = util.format('%s --hide-my-port', args)
  if (this.dbThreads) args = util.format('%s --db-threads %s', args, this.dbThreads)
  if (this.dbMaxOpenFiles) args = util.format('%s --db-max-open-files %s', args, this.dbMaxOpenFiles)
  if (this.dbWriteBufferSize) args = util.format('%s --db-write-buffer-size %s', args, this.dbWriteBufferSize)
  if (this.dbReadCacheSize) args = util.format('%s --db-read-cache-size %s', args, this.dbReadCacheSize)
  if (this.feeAddress) args = util.format('%s --fee-address %s', args, this.feeAddress)
  if (this.feeAmount !== 0) args = util.format('%s --fee-amount %s', args, this.feeAmount)
  return args.split(' ')
}

TurtleCoind.prototype._setupAPI = function () {
  this.api = new TurtleCoindRPC({
    host: this.rpcBindIp,
    port: this.rpcBindPort,
    timeout: this.timeout
  })
}

TurtleCoind.prototype._setupWebSocket = function () {
  if (this.enableWebSocket) {
    this.webSocket = new WebSocket({
      port: (this.rpcBindPort + 1),
      password: this.webSocketPassword
    })

    this.webSocket.on('connection', (socket) => {
      this.emit('info', util.format('[WEBSOCKET] Client connected with socketId: %s', socket.id))
      this._registerWebSocketClientEvents(socket)
    })

    this.webSocket.on('disconnect', (socket) => {
      this.emit('info', util.format('[WEBSOCKET] Client disconnected with socketId: %s', socket.id))
    })

    this.webSocket.on('error', (err) => {
      this.emit('error', util.format('[WEBSOCKET] %s', err))
    })

    this.webSocket.on('auth.success', (socket) => {
      this.emit('info', util.format('[WEBSOCKET] Client authenticated with socketId: %s', socket.id))
    })

    this.webSocket.on('auth.failure', (socket) => {
      this.emit('warning', util.format('[WEBSOCKET] Client failed authentication with socketId: %s', socket.id))
    })

    this.webSocket.on('ready', () => {
      if (this.webSocketPassword) {
        this.emit('info', util.format('Accepting WebSocket connections on %s:%s with password: %s', this.rpcBindIp, (this.rpcBindPort + 1), this.webSocket.password))
      } else {
        this.emit('info', util.format('Accepting WebSocket connections on %s:%s', this.rpcBindIp, (this.rpcBindPort + 1)))
      }
    })

    this.webSocket.on('error', (err) => {
      this.error(util.format('WebSocket Error: %s', err))
    })

    this.on('stopped', (exitcode) => {
      this.webSocket.broadcastProtected({event: 'stopped', data: exitcode})
    })

    this.on('data', (data) => {
      this.webSocket.broadcastProtected({event: 'data', data})
    })

    this.on('error', (err) => {
      this.webSocket.broadcastProtected({event: 'error', data: err})
    })

    this.on('info', (info) => {
      this.webSocket.broadcastProtected({event: 'info', data: info})
    })

    this.on('warning', (warning) => {
      this.webSocket.broadcastProtected({event: 'info', data: warning})
    })

    this.on('start', () => {
      this.webSocket.broadcastProtected({event: 'start'})
    })

    this.on('started', () => {
      this.webSocket.broadcastProtected({event: 'started'})
    })

    this.on('down', () => {
      this.webSocket.broadcastProtected({event: 'down'})
    })

    this.on('syncing', (info) => {
      this.webSocket.broadcastProtected({event: 'syncing', data: info})
    })

    this.on('synced', () => {
      this.webSocket.broadcastProtected({event: 'synced'})
    })

    this.on('ready', (info) => {
      this.webSocket.broadcastProtected({event: 'ready', data: info})
    })

    this.on('desync', () => {
      this.webSocket.broadcastProtected({event: 'desync'})
    })

    this.on('topblock', (height) => {
      this.webSocket.broadcast({event: 'topblock', data: height})
    })

    this.on('block', (block) => {
      this.webSocket.broadcast({event: 'block', data: block})
    })
  }
}

TurtleCoind.prototype._registerWebSocketClientEvents = function (socket) {
  var that = this
  var events = Object.getPrototypeOf(this.api)
  events = Object.getOwnPropertyNames(events).filter((f) => {
    return (f !== 'constructor' && !f.startsWith('_'))
  })
  socket.setMaxListeners(socket.getMaxListeners() + events.length)

  for (var i = 0; i < events.length; i++) {
    (function () {
      var evt = events[i]
      socket.on(evt, (data) => {
        try {
          data = JSON.parse(data)
        } catch (e) {
          data = {}
        }
        data.nonce = data.nonce || nonce()
        that.api[evt](data).then((result) => {
          socket.emit(evt, {nonce: data.nonce, data: result})
        }).catch((err) => {
          socket.emit(evt, {nonce: data.nonce, error: err.toString()})
        })
      })
    })()
  }
}

function fixPath (oldPath) {
  if (!oldPath) return false
  oldPath = oldPath.replace('~', os.homedir())
  oldPath = path.resolve(oldPath)
  return oldPath
}

// This is here because it has to be
function precisionRound (number, precision) {
  var factor = Math.pow(10, precision)
  return Math.round(number * factor) / factor
}

module.exports = TurtleCoind
