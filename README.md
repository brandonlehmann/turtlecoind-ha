[![NPM](https://nodei.co/npm/turtlecoind-ha.png?downloads=true&stars=true)](https://nodei.co/npm/turtlecoind-ha/)

[![Build Status](https://travis-ci.org/brandonlehmann/turtlecoind-ha.png?branch=master)](https://travis-ci.org/brandonlehmann/turtlecoind-ha) [![Build Status](https://ci.appveyor.com/api/projects/status/github/brandonlehmann/turtlecoind-ha?branch=master&svg=true)](https://ci.appveyor.com/project/brandonlehmann/turtlecoind-ha/branch/master)

# TurtleCoind High-Availability Daemon Wrapper

This project is designed to wrap the TurtleCoind daemon on a *nix system and monitor it for hangups, locks, fork, or other events that cause the daemon to stop responding to requests in an accurate manner.

The sample **service.js** includes how to automatically restart the daemon if it hangs, locks, or otherwise stops responding.

## Table of Contents

1. [To Do](#to-do)
2. [Dependencies](#dependencies)
3. [Easy Start](#easy-start)
4. [Keep it Running](#keep-it-running)
5. [Documentation](#documentation)
   1. [Methods](#methods)
   2. [Events](#events)
   3. [TurtleCoind RPC API Interface](#turtlecoind-rpc-api-interface)
   4. [WebSocket Connections](#websocket-connections)

## To Do

N/A

## Dependencies

* [NodeJS v8.x](https://nodejs.org/)
* [TurtleCoind](https://github.com/turtlecoin/turtlecoin/releases) v0.19.0 or higher

## Easy Start

You *must* copy ```TurtleCoind``` into the ```turtlecoind-ha``` folder for the easy start process to occur.

```bash
git clone https://github.com/turtlecoin/turtlecoind-ha.git
cd turtlecoind-ha
cp <TurtleCoind> .
sudo npm install & npm start
```

The installation will also download the latest checkpoints. Please see [TurtleCoin Checkpoints](http://checkpoints.turtlecoin.lol) for more information.

## Keep it Running

I'm a big fan of PM2 so if you don't have it installed, the setup is quite simple.

```bash
npm install -g pm2

pm2 startup
pm2 install pm2-logrotate

pm2 start service.js --name turtlecoind
pm2 save
```

## Updating Checkpoints

This will download the latest checkpoints to use with your node.

```bash
npm run checkpoints
```

## Documentation

### Initialization

Practically all TurtleCoind command line arguments are exposed in the constructor method. Simply include them in your list of options to get activate or use them. Default values are defined below.

```javascript
var daemon = new TurtleCoind({
  // These are our TurtleCoind-ha options
  pollingInterval: 10000, // How often to check the daemon in milliseconds
  maxPollingFailures: 3, // How many polling intervals can fail before we emit a down event?
  checkHeight: true, // Check the daemon block height against known trusted nodes
  maxDeviance: 5, // What is the maximum difference between our block height and the network height that we're willing to accept?
  clearP2pOnStart: true, // Will automatically delete the p2pstate.bin file on start if set to true
  clearDBLockFile: true, // Will automatically delete the DB LOCK file on start if set to true
  timeout: 2000, // How long to wait for RPC responses in milliseconds
  enableWebSocket: false, // Enables a socket.io websocket server on the rpcBindPort + 1
  webSocketPassword: false, // Set this to a password to use for the privileged socket events.

  // These are the standard TurtleCoind options
  path: './TurtleCoind', // Where can I find TurtleCoind?
  dataDir: '~/.TurtleCoin', // Where do you store your blockchain?
  enableCors: false, // Enable CORS support for the domain in this value
  enableBlockExplorer: true, // Enable the block explorer
  enableBlockExplorerDetailed: false, // Enable the detailed block explorer
  loadCheckpoints: false, // If set to a path to a file, will supply that file to the daemon if it exists.
  rpcBindIp: '0.0.0.0', // What IP to bind the RPC server to
  rpcBindPort: 11898, // What Port to bind the RPC server to
  p2pBindIp: '0.0.0.0', // What IP to bind the P2P network to
  p2pBindPort: 11897, // What Port to bind the P2P network to
  p2pExternalPort: 0, // What External Port to bind the P2P network to for those behind NAT
  allowLocalIp: false, // Add our own IP to the peer list?
  peers: false, // Manually add the peer(s) to the list. Allows for a string or an Array of strings.
  priorityNodes: false, // Manually add the priority node(s) to the peer list. Allows for a string or an Array of strings.
  exclusiveNodes: false, // Only add these node(s) to the peer list. Allows for a string or an Array of strings.
  seedNode: false, // Connect to this node to get the peer list then quit. Allows for a string.
  hideMyPort: false, // Hide from the rest of the network
  dbThreads: 2, // Number of database background threads
  dbMaxOpenFiles: 100, // Number of allowed open files for the DB
  dbWriteBufferSize: 256, // Size of the DB write buffer in MB
  dbReadBufferSize: 10, // Size of the DB read cache in MB
  dbCompression: false, // enable rocksdb compression
  feeAddress: false, // allows to specify the fee address for the node
  feeAmount: 0 // allows to specify the fee amount for the node
})
```

## Methods

### daemon.api.start()

Starts up the daemon and starts monitoring the process.

```javascript
daemon.start()
```

### daemon.api.stop()

Stops the daemon and halts all monitoring processes.

```javascript
daemon.stop()
```

### daemon.api.write(text)

Allows you to send a line of text to the daemon console

```javascript
daemon.write('help')
```

## Events

### Event - *block*

This is emitted whenever a new block is found on the network (or locally).

```javascript
daemon.on('block', (blockInfo) => {
  // do something
})
```

#### Sample data

```javascript
{
  "alreadyGeneratedCoins": "1484230931125",
  "alreadyGeneratedTransactions": 974921,
  "baseReward": 2935998,
  "blockSize": 48846,
  "depth": 0,
  "difficulty": 358164537,
  "effectiveSizeMedian": 100000,
  "hash": "f11580d74134ac34673c74f8da458080aacbe1eccea05b197e9d10bde05139f5",
  "height": 501854,
  "major_version": 4,
  "minor_version": 0,
  "nonce": 214748383,
  "orphan_status": false,
  "penalty": 0,
  "prev_hash": "674046ea53a8673c630bd34655c4723199e69fdcfd518503f4c714e16a7121b5",
  "reward": 2936608,
  "sizeMedian": 231,
  "timestamp": 1527891820,
  "totalFeeAmount": 610,
  "transactions": [
    {
      "amount_out": 2936608,
      "fee": 0,
      "hash": "61b29d7a3fe931928388f14cffb5e705a68db219e1df6b4e15aee39d1c2a16e8",
      "size": 266
    },
    {
      "amount_out": 2005890,
      "fee": 110,
      "hash": "8096a55ccd0d4a736b3176836429905f349c3de53dd4e92d34f4a2db7613dc4b",
      "size": 2288
    },
    {
      "amount_out": 3999900,
      "fee": 100,
      "hash": "304a068cbe87cd02b48f80f8831197174b133870d0c118d1fe65d07a33331c4e",
      "size": 2691
    },
    {
      "amount_out": 7862058,
      "fee": 100,
      "hash": "29c0d6708e8148eec6e02173b3bab0093768e5f486f553939495a47f883b4445",
      "size": 9638
    },
    {
      "amount_out": 6951392,
      "fee": 100,
      "hash": "fe661f11a0ba9838610c147f70813c17755ab608c7b033f6432c0b434671182c",
      "size": 10004
    },
    {
      "amount_out": 6800150,
      "fee": 100,
      "hash": "4b0366f79ec341cf60d5ef8c9dd8e65974dacb1be1d30dc0bf11d2d9d8240b46",
      "size": 11493
    },
    {
      "amount_out": 7260417,
      "fee": 100,
      "hash": "066b86268b7bb2f780ed76f452d1e6f7213dc6cae273b71fbd4ba378befaed00",
      "size": 12155
    }
  ],
  "transactionsCumulativeSize": 48535
}
```

### Event - *data*

Feeds back the *stdout* of the daemon process on a line by line basis. You can use this to monitor the progress of the application or hook and do your own development.

```javascript
daemon.on('data', (data) => {
  // do something
})
```

### Event - *desync*

This event is emitted when the daemon has lost synchronization with the TurtleCoin network

```javascript
daemon.on('descync', (daemonHeight, networkHeight, deviance) => {
  // do something
})
```

### Event - *down*

This event is emitted when the daemon is not responding to RPC requests or local console checks. We believe at that point that the daemon is hung.

```javascript
daemon.on('down', () => {
  // do something
})
```

### Event - *error*

This event is emitted when the daemon or our service encounters an error.

```javascript
daemon.on('error', (err) => {
  // do something
})
```

### Event - *info*

This event is emitted when the daemon or our service has something to tell you but its not that important.

```javascript
daemon.on('info', (info) => {
  // do something
})
```

### Event - *ready*

This event is emitted when the daemon is synchronized with the TurtleCoin network and is passing all the checks we have for it. It returns the equivalent of a */getinfo* call to the RPC server with a few minor additions.

```javascript
daemon.on('ready', (info) => {
  // do something
})
```

#### Sample Data

```javascript
{
  "alt_blocks_count": 1,
  "difficulty": 250799029,
  "grey_peerlist_size": 4995,
  "hashrate": 8359967,
  "height": 502282,
  "incoming_connections_count": 8,
  "last_known_block_index": 340143,
  "network_height": 502282,
  "outgoing_connections_count": 8,
  "status": "OK",
  "synced": true,
  "tx_count": 473402,
  "tx_pool_size": 0,
  "version": "0.5.0",
  "white_peerlist_size": 602
}
```

### Event - *start*

This event is emitted when the daemon starts. The callback contains the command line arguments supplied to TurtleCoind.

```javascript
daemon.on('start', (executablePath, args) => {
  // do something
})
```

### Event - *started*

This event is emitted when the daemon is now accepting P2P connections.

```javascript
daemon.on('started', () => {
  // do something
})
```

### Event - *stopped*

This event is emitted when the daemon is stopped for whatever reason.

```javascript
daemon.on('stopped', () => {
  // do something
})
```

### Event - *synced*

This event is emitted when the daemon has synchronized with the TurtleCoin network.

```javascript
daemon.on('synced', () => {
  // do something
})
```

### Event - *syncing*

This event is emitted when the daemon is syncing. It gives the current status of the sync.

```javascript
daemon.on('syncing', (height, networkHeight, percent) => {
  // do something
})
```

### Event - *topblock*

This event is emitted when the daemon detects a new top block on the network. It will be the *next* block found.

```javascript
daemon.on('topblock', (height) => {
  // do something
})
```
## TurtleCoind RPC API Interface

As we can actually run this wrapper inside another nodeJS project, we expose all of the TurtleCoind RPC API commands via the ```daemon.api``` property. Each of the below methods are [Javascript Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises). For safety sake, **always** handle your promise catches as we do use them properly.

Methods noted having options have parameters that may be *optional* or *required* as documented.

### daemon.api.getBlocks(options)

Returns information on the last 30 blocks before *height* (inclusive).

```options.height``` The height of the blockchain to start at - *required*

#### Example Data

```javascript
[
  {
    "cumul_size": 22041,
    "difficulty": 285124963,
    "hash": "62f0058453292af5e1aa070f8526f7642ab6974c6af2c17088c21b31679c813d",
    "height": 500000,
    "timestamp": 1527834137,
    "tx_count": 4
  },
  {
    "cumul_size": 384,
    "difficulty": 258237161,
    "hash": "74a45602da61b8b8ff565b1c81c854416046a23ca53f4416684ffaa60bc50796",
    "height": 499999,
    "timestamp": 1527834031,
    "tx_count": 1
  },
  {
    "cumul_size": 418,
    "difficulty": 256087255,
    "hash": "ed628ff13eacd5b99c5d7bcb3aeb29ef8fc61dbb21d48b65e0cdaf5ab21211c1",
    "height": 499998,
    "timestamp": 1527834020,
    "tx_count": 1
  }
]
```

### daemon.api.getBlock(options)

Returns information on a single block

```options.hash``` Block hash of the block you wish to retrieve - *required*

#### Sample Data

```javascript
{
  "alreadyGeneratedCoins": "1484230931125",
  "alreadyGeneratedTransactions": 974921,
  "baseReward": 2935998,
  "blockSize": 48846,
  "depth": 0,
  "difficulty": 358164537,
  "effectiveSizeMedian": 100000,
  "hash": "f11580d74134ac34673c74f8da458080aacbe1eccea05b197e9d10bde05139f5",
  "height": 501854,
  "major_version": 4,
  "minor_version": 0,
  "nonce": 214748383,
  "orphan_status": false,
  "penalty": 0,
  "prev_hash": "674046ea53a8673c630bd34655c4723199e69fdcfd518503f4c714e16a7121b5",
  "reward": 2936608,
  "sizeMedian": 231,
  "timestamp": 1527891820,
  "totalFeeAmount": 610,
  "transactions": [
    {
      "amount_out": 2936608,
      "fee": 0,
      "hash": "61b29d7a3fe931928388f14cffb5e705a68db219e1df6b4e15aee39d1c2a16e8",
      "size": 266
    },
    {
      "amount_out": 2005890,
      "fee": 110,
      "hash": "8096a55ccd0d4a736b3176836429905f349c3de53dd4e92d34f4a2db7613dc4b",
      "size": 2288
    },
    {
      "amount_out": 3999900,
      "fee": 100,
      "hash": "304a068cbe87cd02b48f80f8831197174b133870d0c118d1fe65d07a33331c4e",
      "size": 2691
    },
    {
      "amount_out": 7862058,
      "fee": 100,
      "hash": "29c0d6708e8148eec6e02173b3bab0093768e5f486f553939495a47f883b4445",
      "size": 9638
    },
    {
      "amount_out": 6951392,
      "fee": 100,
      "hash": "fe661f11a0ba9838610c147f70813c17755ab608c7b033f6432c0b434671182c",
      "size": 10004
    },
    {
      "amount_out": 6800150,
      "fee": 100,
      "hash": "4b0366f79ec341cf60d5ef8c9dd8e65974dacb1be1d30dc0bf11d2d9d8240b46",
      "size": 11493
    },
    {
      "amount_out": 7260417,
      "fee": 100,
      "hash": "066b86268b7bb2f780ed76f452d1e6f7213dc6cae273b71fbd4ba378befaed00",
      "size": 12155
    }
  ],
  "transactionsCumulativeSize": 48535
}
```

### daemon.api.getTransaction(options)

Gets information on the single transaction.

```options.hash``` The transaction hash - *required*

#### Sample Data

```javascript
{
  "block": {
    "cumul_size": 22041,
    "difficulty": 103205633,
    "hash": "62f0058453292af5e1aa070f8526f7642ab6974c6af2c17088c21b31679c813d",
    "height": 500000,
    "timestamp": 1527834137,
    "tx_count": 4
  },
  "status": "OK",
  "tx": {
    "extra": "019e430ecdd501714900c71cb45fd49b4fa77ebd4a68d967cc2419ccd4e72378e3020800000000956710b6",
    "unlock_time": 500040,
    "version": 1,
    "vin": [
      {
        "type": "ff",
        "value": {
          "height": 500000
        }
      }
    ],
    "vout": [
      {
        "amount": 80,
        "target": {
          "data": {
            "key": "5ce69a87940df7ae8443261ff610861d2e4207a7556ef1aa35878c0a5e7e382d"
          },
          "type": "02"
        }
      },
      {
        "amount": 200,
        "target": {
          "data": {
            "key": "7c7f316befaac16ba3782a2ce489e7c0f16c2b733ac0eaa0a72a12ee637822e9"
          },
          "type": "02"
        }
      },
      {
        "amount": 6000,
        "target": {
          "data": {
            "key": "defcb7eb6537bf0a63368ed464df10197e67d7ea8f080e885911cf9ea71abb62"
          },
          "type": "02"
        }
      },
      {
        "amount": 30000,
        "target": {
          "data": {
            "key": "9693e864dba53f308d0b59623c608b6fe16bbdc7cdc75be94f78582d547b46a4"
          },
          "type": "02"
        }
      },
      {
        "amount": 900000,
        "target": {
          "data": {
            "key": "b739e9fbaa3ee976a9ed8ad93a2731ee191c384cf136929e737786573fcd3e96"
          },
          "type": "02"
        }
      },
      {
        "amount": 2000000,
        "target": {
          "data": {
            "key": "5621667d44e7ffb87e5010a5984c188f58a799efb01569e8e42fa2415bb7d14a"
          },
          "type": "02"
        }
      }
    ]
  },
  "txDetails": {
    "amount_out": 2936280,
    "fee": 0,
    "hash": "702ad5bd04b9eff14b080d508f69a320da1909e989d6c163c18f80ae7a5ab832",
    "mixin": 0,
    "paymentId": "",
    "size": 266
  }
}
```

### daemon.api.getTransactionPool()

Gets the list of transaction hashs in the mempool.

#### Sample Data

```javascript
[
  {
    "amount_out": 1660000,
    "fee": 0,
    "hash": "721ae50994d5446d5683ca79d6fa97dce321a39e88e1df70ae433dc67573841b",
    "size": 13046
  },
  {
    "amount_out": 325000,
    "fee": 0,
    "hash": "fc88004d9cd012c0341506f13003da015efec940cffca0baeff0a381c7846203",
    "size": 28038
  },
  {
    "amount_out": 4040000,
    "fee": 0,
    "hash": "de63292050c73db4bb74637910ceab2aef6b9a0b611d0d93e7a757f9c53f975a",
    "size": 28058
  },
  {
    "amount_out": 10200000,
    "fee": 0,
    "hash": "edcd17184bd0c953be009da6b555e90a7cd5fc596f5f560332382995be7b55a7",
    "size": 28091
  },
  {
    "amount_out": 3380000,
    "fee": 0,
    "hash": "e1846775508a750a2f027db46972114e86866d27d304c9178867ae4616b3723c",
    "size": 28092
  },
  {
    "amount_out": 3960000,
    "fee": 0,
    "hash": "015646a75a5279050b5f02df6d5ff9814860fabc8b093818995a4fb6a33e45d8",
    "size": 28096
  },
  {
    "amount_out": 3860000,
    "fee": 0,
    "hash": "5e2f8bcc8c6c9a74e8ce33a66213711b418633eceeefce50042aecb8544676ba",
    "size": 28097
  }
]
```

### daemon.api.getBlockCount()

Gets the current block count

#### Sample Data

```javascript
502322
```

### daemon.api.getBlockHash(options)

Gets a block hash by height.

```options.height``` The height of the block - *required*

#### Sample Data

```text
74a45602da61b8b8ff565b1c81c854416046a23ca53f4416684ffaa60bc50796
```

### daemon.api.getBlockTemplate(options)

```options.reserveSize``` Reserve size - *required*
```options.walletAddress``` Public Wallet Address - *required*

#### Sample Data

```javascript
{
  "blocktemplate_blob": "0400...0581",
  "difficulty": 194635827,
  "height": 502335,
  "reserved_offset": 412,
  "status": "OK"
}
```

### daemon.api.submitBlock(options)

```options.blockBlob``` The block blob data - *required*

#### Sample Data

```javascript
{
  "status": "OK"
}
```

### daemon.api.getLastBlockHeader()

#### Sample Data

```javascript
{
  "block_header": {
    "block_size": 419,
    "depth": 0,
    "difficulty": 200671816,
    "hash": "7d6db7b77232d41c19d898e81c85ecf08c4e8dfa3434f975a319f6261a695739",
    "height": 502345,
    "major_version": 4,
    "minor_version": 0,
    "nonce": 130876,
    "num_txes": 1,
    "orphan_status": false,
    "prev_hash": "5af657331edff98791720c23aacf72e8b6247ddba2a5c42c93984a46946abd14",
    "reward": 2935955,
    "timestamp": 1527907348
  },
  "status": "OK"
}
```

### daemon.api.getBlockHeaderByHash(options)

```options.hash``` Block hash - *required*

#### Sample Data

```javascript
{
  "block_header": {
    "block_size": 419,
    "depth": 2,
    "difficulty": 200671816,
    "hash": "7d6db7b77232d41c19d898e81c85ecf08c4e8dfa3434f975a319f6261a695739",
    "height": 502345,
    "major_version": 4,
    "minor_version": 0,
    "nonce": 130876,
    "num_txes": 1,
    "orphan_status": false,
    "prev_hash": "5af657331edff98791720c23aacf72e8b6247ddba2a5c42c93984a46946abd14",
    "reward": 2935955,
    "timestamp": 1527907348
  },
  "status": "OK"
}
```

### daemon.api.getBlockHeaderByHeight(options)

```options.height``` Block height - *required*

#### Sample Data

```javascript
{
  "block_header": {
    "block_size": 419,
    "depth": 2,
    "difficulty": 200671816,
    "hash": "7d6db7b77232d41c19d898e81c85ecf08c4e8dfa3434f975a319f6261a695739",
    "height": 502345,
    "major_version": 4,
    "minor_version": 0,
    "nonce": 130876,
    "num_txes": 1,
    "orphan_status": false,
    "prev_hash": "5af657331edff98791720c23aacf72e8b6247ddba2a5c42c93984a46946abd14",
    "reward": 2935955,
    "timestamp": 1527907348
  },
  "status": "OK"
}
```

### daemon.api.getCurrencyId()

#### Sample Data

```text
7fb97df81221dd1366051b2d0bc7f49c66c22ac4431d879c895b06d66ef66f4c
```

### daemon.api.height()

#### Sample Data

```javascript
{
  "height": 502354,
  "network_height": 502354,
  "status": "OK"
}
```

### daemon.api.info()

#### Sample Data

```javascript
{
  "alt_blocks_count": 14,
  "difficulty": 289121015,
  "grey_peerlist_size": 4997,
  "hashrate": 9637367,
  "height": 502354,
  "incoming_connections_count": 12,
  "last_known_block_index": 502352,
  "network_height": 502354,
  "outgoing_connections_count": 8,
  "status": "OK",
  "synced": true,
  "tx_count": 473486,
  "tx_pool_size": 1,
  "version": "0.5.0",
  "white_peerlist_size": 1000
}
```

### daemon.api.fee()

#### Sample Data

```javascript
{
  "address": "TRTLv27NRnfaGLvxDuE1SfQt2zbvfEiTNJtFcBNZwUAAQYL1oxejK1c8PaCTCa61he99a31So9KNaQ4kGkKjjstwhyM2FqdwUyU",
  "amount": 5000,
  "status": "OK"
}
```

### daemon.api.getTransactions()

#### Sample Data

```javascript
{
  "missed_tx": [],
  "status": "OK",
  "txs_as_hex": []
}
```

### daemon.api.peers()

#### Sample Data

```javascript
{
  "peers": [
    "174.21.179.198:11897",
    "94.23.49.75:11897",
    "...",
    "80.14.183.25:11897",
    "71.193.1.94:11897"
  ],
  "status": "OK"
}
```

### daemon.api.sendRawTransaction()

**Note:** This method is not implemented.

## WebSocket Connections

A WebSocket [socket.io](https://socket.io/) server is initialized if ```enableWebSocket``` is true in the initialization of the module. The server is created on the ```rpcBindPort``` specified + ```1```.

Some events require that the socket is authenticated via a ```auth``` event.

If the **nonce** column is *Yes* you may send a *nonce* in the payload in addition to the options defined.

### Client Initiated Events

|Event|JSON Payload|Nonce Honored|Payload|
|---|---|---|---|
|auth|No|No|*string* sha256 hash of password|
|getBlocks|Yes|Yes|See [daemon.api.getBlocks(options)](#daemonapigetblocksoptions)|
|getBlock|Yes|Yes|See [daemon.api.getBlocks(options)](#daemonapigetblocksoptions)|
|getTransaction|Yes|Yes|See [daemon.api.getTransaction(options)](#daemonapigettransactionoptions)|
|getTransactionPool|Yes|Yes|See [daemon.api.getTransactionPool()](#daemonapigettransactionpool)|
|getBlockCount|Yes|Yes|See [daemon.api.getBlockCount()](#daemonapigetblockcount)|
|getBlockHash|Yes|Yes|See [daemon.api.getBlockHash(options)](#daemonapigetblockhashoptions)|
|getBlockTemplate|Yes|Yes|See [daemon.api.getBlockTemplate(options)](#daemonapigetblocktemplateoptions)|
|submitBlock|Yes|Yes|See [daemon.api.submitBlock(options)](#daemonapisubmitblockoptions)|
|getLastBlockHeader|Yes|Yes|See [daemon.api.getLastBlockHeader()](#daemonapigetlastblockheader)|
|getBlockHeaderByHash|Yes|Yes|See [daemon.api.getBlockHeaderByHash(options)](#daemonapigetblockheaderbyhashoptions)|
|getBlockHeaderByHeight|Yes|Yes|See [daemon.api.getBlockHeaderByHeight(options)](#daemonapigetblockheaderbyheightoptions)|
|getCurrencyId|Yes|Yes|See [daemon.api.getCurrencyId()](#daemonapigetcurrencyid)|
|height|Yes|Yes|See [daemon.api.getHeight()](#daemonapiheight)|
|info|Yes|Yes|See [daemon.api.getInfo()](#daemonapiinfo)|
|fee|Yes|Yes|See [daemon.api.fee()](#daemonapifee)|
|getTransactions|Yes|Yes|See [daemon.api.getTransactions()](#daemonapigettransactions)|
|peers|Yes|Yes|See [daemon.api.getPeers()](#daemonapipeers)|
|sendRawTransaction|Yes|Yes|See [daemon.api.sendRawTransaction()](#daemonapisendrawtransaction)|


### Server Initiated Events

|Event|Authentication Required|Payload|
|---|---|---|
|block|**No**|See [Event - block](#event---block)|
|stopped|Yes|See [Event - stopped](#event---stopped)|
|data|Yes|See [Event - data](#event---data)|
|desync|Yes|See [Event - desync](#event---desync)|
|down|Yes|See [Event - down](#event---down)|
|error|Yes|See [Event - error](#event---error)|
|info|Yes|See [Event - info](#event---info)|
|ready|Yes|See [Event - ready](#event---ready)|
|start|Yes|See [Event - start](#event---start)|
|started|Yes|See [Event - started](#event---started)|
|synced|Yes|See [Event - synced](#event---synced)|
|syncing|Yes|See [Event - syncing](#event---syncing)|
|topblock|**No**|See [Event - topblock](#event---topblock)|
|warning|Yes|*See [Event - warning](#event---warning)|

### Server Responses

All responses except for ***auth*** return data in the same format.

```javascript
{
  "nonce": 123456,
  "data": <payload>
}
```
|Event|Nonced|Payload|
|---|---|---|
|auth|No|*boolean* Responds to a client initiated *auth* event. If **true** the password was correct. If **false** the password was incorrect.|
|getBlocks|Yes|See [daemon.api.getBlocks(options)](#daemonapigetblocksoptions)|
|getBlock|Yes|See [daemon.api.getBlocks(options)](#daemonapigetblocksoptions)|
|getTransaction|Yes|See [daemon.api.getTransaction(options)](#daemonapigettransactionoptions)|
|getTransactionPool|Yes|See [daemon.api.getTransactionPool()](#daemonapigettransactionpool)|
|getBlockCount|Yes|See [daemon.api.getBlockCount()](#daemonapigetblockcount)|
|getBlockHash|Yes|See [daemon.api.getBlockHash(options)](#daemonapigetblockhashoptions)|
|getBlockTemplate|Yes|See [daemon.api.getBlockTemplate(options)](#daemonapigetblocktemplateoptions)|
|submitBlock|Yes|See [daemon.api.submitBlock(options)](#daemonapisubmitblockoptions)|
|getLastBlockHeader|Yes|See [daemon.api.getLastBlockHeader()](#daemonapigetlastblockheader)|
|getBlockHeaderByHash|Yes|See [daemon.api.getBlockHeaderByHash(options)](#daemonapigetblockheaderbyhashoptions)|
|getBlockHeaderByHeight|Yes|See [daemon.api.getBlockHeaderByHeight(options)](#daemonapigetblockheaderbyheightoptions)|
|getCurrencyId|Yes|See [daemon.api.getCurrencyId()](#daemonapigetcurrencyid)|
|height|Yes|See [daemon.api.height()](#daemonapigetheight)|
|info|Yes|See [daemon.api.info()](#daemonapigetinfo)|
|fee|Yes|See [daemon.api.fee()](#daemonapifee)|
|getTransactions|Yes|See [daemon.api.getTransactions()](#daemonapigettransactions)|
|peers|Yes|See [daemon.api.peers()](#daemonapigetpeers)|
|sendRawTransaction|Yes|See [daemon.api.sendRawTransaction()](#daemonapisendrawtransaction)|

## License

Copyright (c) 2018, Brandon Lehmann, The TurtleCoin Developers

Please see the included LICENSE file for more information.
