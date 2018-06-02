'use strict'

const request = require('request-promise')
const util = require('util')

var TurtleCoindRPC = function (opts) {
  opts = opts || {}
  if (!(this instanceof TurtleCoindRPC)) return new TurtleCoindRPC(opts)
  this.host = opts.host || '127.0.0.1'
  this.port = opts.port || 11898
  this.timeout = opts.timeout || 2000
}

TurtleCoindRPC.prototype.getBlocks = function (opts) {
  return new Promise((resolve, reject) => {
    opts = opts || {}
    if (!opts.height) return reject(new Error('must specify height'))

    this._post('f_blocks_list_json', {
      height: opts.height
    }).then((result) => {
      return resolve(result.blocks)
    }).catch((err) => {
      return reject(err)
    })
  })
}

TurtleCoindRPC.prototype.getBlock = function (opts) {
  return new Promise((resolve, reject) => {
    opts = opts || {}
    if (!opts.hash) return reject(new Error('must specify hash'))

    this._post('f_block_json', {
      hash: opts.hash
    }).then((result) => {
      return resolve(result.block)
    }).catch((err) => {
      return reject(err)
    })
  })
}

TurtleCoindRPC.prototype.getTransaction = function (opts) {
  return new Promise((resolve, reject) => {
    opts = opts || {}
    if (!opts.hash) return reject(new Error('must specify hash'))

    this._post('f_transaction_json', {
      hash: opts.hash
    }).then((result) => {
      return resolve(result)
    }).catch((err) => {
      return reject(err)
    })
  })
}

TurtleCoindRPC.prototype.getTransactionPool = function () {
  return new Promise((resolve, reject) => {
    this._post('f_on_transactions_pool_json').then((result) => {
      return resolve(result.transactions)
    }).catch((err) => {
      return reject(err)
    })
  })
}

TurtleCoindRPC.prototype.getBlockCount = function (opts) {
  return new Promise((resolve, reject) => {
    this._post('getblockcount').then((result) => {
      return resolve(result.count)
    }).catch((err) => {
      return reject(err)
    })
  })
}

TurtleCoindRPC.prototype.getBlockHash = function (opts) {
  return new Promise((resolve, reject) => {
    opts = opts || {}
    if (!opts.height) return reject(new Error('must specify height'))

    this._post('on_getblockhash', [
      opts.height
    ]).then((result) => {
      return resolve(result)
    }).catch((err) => {
      return reject(err)
    })
  })
}

TurtleCoindRPC.prototype.getBlockTemplate = function (opts) {
  return new Promise((resolve, reject) => {
    opts = opts || {}
    if (!opts.reserveSize) return reject(new Error('must specify reserveSize'))
    if (!opts.walletAddress) return reject(new Error('must specify walletAddress'))

    this._post('getblocktemplate', {
      reserve_size: opts.reserveSize,
      wallet_address: opts.walletAddress
    }).then((result) => {
      return resolve(result)
    }).catch((err) => {
      return reject(err)
    })
  })
}

TurtleCoindRPC.prototype.submitBlock = function (opts) {
  return new Promise((resolve, reject) => {
    opts = opts || {}
    if (!opts.blockBlob) return reject(new Error('must specify blockBlob'))
    this._post('submitblock', [
      opts.blockBlob
    ]).then((result) => {
      return resolve(result)
    }).catch((err) => {
      return reject(err)
    })
  })
}

TurtleCoindRPC.prototype.getLastBlockHeader = function () {
  return new Promise((resolve, reject) => {
    this._post('getlastblockheader').then((result) => {
      return resolve(result.block_header)
    }).catch((err) => {
      return reject(err)
    })
  })
}

TurtleCoindRPC.prototype.getBlockHeaderByHash = function (opts) {
  return new Promise((resolve, reject) => {
    opts = opts || {}
    if (!opts.hash) return reject(new Error('must specify hash'))

    this._post('getblockheaderbyhash', {
      hash: opts.hash
    }).then((result) => {
      return resolve(result.block_header)
    }).catch((err) => {
      return reject(err)
    })
  })
}

TurtleCoindRPC.prototype.getBlockHeaderByHeight = function (opts) {
  return new Promise((resolve, reject) => {
    opts = opts || {}
    if (!opts.height) return reject(new Error('must specify height'))

    this._post('getblockheaderbyheight', {
      height: opts.height
    }).then((result) => {
      return resolve(result.block_header)
    }).catch((err) => {
      return reject(err)
    })
  })
}

TurtleCoindRPC.prototype.getCurrencyId = function () {
  return new Promise((resolve, reject) => {
    this._post('getcurrencyid').then((result) => {
      return resolve(result.currency_id_blob)
    }).catch((err) => {
      return reject(err)
    })
  })
}

TurtleCoindRPC.prototype.getHeight = function () {
  return new Promise((resolve, reject) => {
    this._get('getheight').then((result) => {
      return resolve(result)
    }).catch((err) => {
      return reject(err)
    })
  })
}

TurtleCoindRPC.prototype.getInfo = function () {
  return new Promise((resolve, reject) => {
    this._get('getinfo').then((result) => {
      return resolve(result)
    }).catch((err) => {
      return reject(err)
    })
  })
}

TurtleCoindRPC.prototype.getTransactions = function () {
  return new Promise((resolve, reject) => {
    this._get('gettransactions').then((result) => {
      return resolve(result)
    }).catch((err) => {
      return reject(err)
    })
  })
}

TurtleCoindRPC.prototype.getPeers = function () {
  return new Promise((resolve, reject) => {
    this._get('getpeers').then((result) => {
      return resolve(result)
    }).catch((err) => {
      return reject(err)
    })
  })
}

TurtleCoindRPC.prototype.sendRawTransaction = function (opts) {
  return new Promise((resolve, reject) => {
    return reject(new Error('Not implemented'))
  })
}

TurtleCoindRPC.prototype._get = function (method) {
  return new Promise((resolve, reject) => {
    if (method.length === 0) return reject(new Error('no method supplied'))

    request({
      uri: util.format('http://%s:%s/%s', this.host, this.port, method),
      method: 'GET',
      json: true,
      timeout: this.timeout
    }).then((result) => {
      return resolve(result)
    }).catch((err) => {
      return reject(err)
    })
  })
}

TurtleCoindRPC.prototype._post = function (method, params) {
  return new Promise((resolve, reject) => {
    if (method.length === 0) return reject(new Error('no method supplied'))
    params = params || {}

    var body = {
      jsonrpc: '2.0',
      method: method,
      params: params
    }

    request({
      uri: util.format('http://%s:%s/json_rpc', this.host, this.port),
      method: 'POST',
      body: body,
      json: true,
      timeout: this.timeout
    }).then((result) => {
      if (!result.error) {
        return resolve(result.result)
      } else {
        return reject(result.error.message)
      }
    }).catch((err) => {
      return reject(err)
    })
  })
}

module.exports = TurtleCoindRPC
