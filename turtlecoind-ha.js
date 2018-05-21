'use strict'

const pty = require('node-pty')
const util = require('util')
const inherits = require('util').inherits
const EventEmitter = require('events').EventEmitter
const request = require('request-promise')
const fs = require('fs')
const path = require('path')
const os = require('os')
const shelljs = require('shelljs')

const daemonResponses = {
  synced: 'Successfully synchronized with the TurtleCoin Network.',
  started: 'P2p server initialized OK',
  help: 'Show this help'
}
const blockTargetTime = 30

const TurtleCoind = function (opts) {
  opts = opts || {}
  if (!(this instanceof TurtleCoind)) return new TurtleCoind(opts)
  this.path = opts.path || path.resolve(__dirname, './TurtleCoind')
  this.dataDir = opts.dataDir || path.resolve(os.homedir(), './.TurtleCoin')
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

  // These values control how often we check the daemon and how long we are
  // willing to wait for responses
  this.pollingInterval = opts.pollingInterval || 10000
  this.maxPollingFailures = opts.maxPollingFailures || 3
  this.timeout = opts.timeout || 2000

  // These values are related to the checking of the daemon once it's in synced
  // if we detect that the daemon falls out of sync, do we trigger a down event?
  this.checkHeight = opts.checkHeight || true
  this.maxDeviance = opts.maxDeviance || 5

  // This will automatically clear the P2P state file upon daemon start
  this.clearP2pOnStart = opts.clearP2pOnStart || true

  // This will automatically clear the DB LOCK file if we find it
  this.clearDBLockFile = opts.clearDBLockFile || true

  // We could query ourselves via 0.0.0.0 but I prefer 127.0.0.1
  this._rpcQueryIp = (this.rpcBindIp === '0.0.0.0') ? '127.0.0.1' : this.rpcBindIp

  // if we find the ~ HOME shortcut in the paths, we need to replace those manually
  if (this.loadCheckpoints) {
    this.loadCheckpoints = this.loadCheckpoints.replace('~', os.homedir())
    this.loadCheckpoints = path.resolve(this.loadCheckpoints)
  }
  this.path = this.path.replace('~', os.homedir())
  this.dataDir = this.dataDir.replace('~', os.homedir())

  // for sanity sake we always resolve our paths
  this.path = path.resolve(this.path)
  this.dataDir = path.resolve(this.dataDir)
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
    var p2pfile = path.resolve(util.format('%s/p2pstate.bin', this.datDir))
    if (fs.existsSync(p2pfile)) {
      try {
        fs.unlinkSync(p2pfile)
        this.emit('info', util.format('Deleted the P2P State File at: %s', p2pfile))
      } catch (e) {
        this.emit('error', util.format('Could not delete the P2P State File at: %s', p2pfile, e))
      }
    }
  }
  this.sycned = false
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
    this._checkChildStdio(data)
    this.emit('data', data)
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
  if (data.indexOf(daemonResponses.synced) !== -1 && !this.synced) {
    this._getHeight().then((height) => {
      if (height.network_height === height.height) {
        this._checkServices()
        this.synced = true
        this.emit('synced')
      }
    }).catch((err) => {
      this.emit('error', err)
    })
  } else if (data.indexOf(daemonResponses.started) !== -1) {
    this.emit('started')
  } else if (data.indexOf(daemonResponses.help) !== -1) {
    this.help = true
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
      this._getInfo(),
      this._getHeight(),
      this._getTransactions()
    ]).then((results) => {
      if (results[0].height === results[1].height && results[0].status === results[1].status && results[1].status === results[2].status) {
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

TurtleCoind.prototype._queryRpc = function (method) {
  return new Promise((resolve, reject) => {
    request({
      method: 'GET',
      uri: util.format('http://%s:%s/%s', this.rpcBindIp, this.rpcBindPort, method),
      timeout: this.timeout
    }).then((data) => {
      return resolve(JSON.parse(data))
    }).catch((err) => {
      return reject(err)
    })
  })
}

TurtleCoind.prototype._getInfo = function () {
  return new Promise((resolve, reject) => {
    this._queryRpc('getinfo').then((data) => {
      return resolve(data)
    }).catch((err) => {
      return reject(util.format('Could not get /getInfo: %s', err))
    })
  })
}

TurtleCoind.prototype._getHeight = function () {
  return new Promise((resolve, reject) => {
    this._queryRpc('getheight').then((data) => {
      return resolve(data)
    }).catch((err) => {
      return reject(util.format('Could not get /getheight: %s', err))
    })
  })
}

TurtleCoind.prototype._getTransactions = function () {
  return new Promise((resolve, reject) => {
    this._queryRpc('gettransactions').then((data) => {
      return resolve(data)
    }).catch((err) => {
      return reject(util.format('Could not get /gettransactions: %s', err))
    })
  })
}

TurtleCoind.prototype._buildargs = function () {
  var args = ''
  if (this.dataDir) args = util.format('%s --data-dir %s', args, this.dataDir)
  if (this.testnet) args = util.format('%s --testnet', args)
  if (this.enableCors) args = util.format('%s --enable-cors %s', args, this.enableCors)
  if (this.enableBlockExplorer) args = util.format('%s --enable_blockexplorer', args)
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
  return args.split(' ')
}

module.exports = TurtleCoind
