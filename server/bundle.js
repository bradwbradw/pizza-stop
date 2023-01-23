const fs = require('fs');
var path = require('path');
const _ = require('lodash');


module.exports = {
  cache: require('../module/cache.js'),
  geckoClient: require('../module/gecko-client.js'),
  queue: require('../module/queue.js'),
  chains: require('../module/chains.js'),
  web3: require('../module/web3-client.js'),
  fns: require('../module/fns.js'),
  scanClient: require('../module/scan-client.js'),
  transactionHistory: require('../module/transaction-history.js')
  //  moralisClient:require('./moralis-client.js')
}
