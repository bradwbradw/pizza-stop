
var _ = require('lodash');

var scan = require('./scan-client.js');

var ccxt = require('ccxt');

var fns = require('./fns.js');

var chains = require('./chains.js');

var depositMethodCodes = '0x8dbdbe6d 0xe2bbb158'.split(' ');

function get(chainID, address, n) {
  var pages = _.floor(n / 100);
  var transactions = [];

  var p = Promise.resolve([]);

  var scanner = scan.client(chainID);

  _.each(_.range(1, pages), page => {
    p = p.then(() => {
      return scanner.transactionHistory(address, page, 100)
        .then(tArr => {
          transactions = _.concat(transactions, tArr);
        })
    })
  });
  return p.then(() => {
    return transactions;
  })
}


function deposits({ chainID, address, numTransactions }) {

  return get(chainID, address, numTransactions)
    .then(transactions => {
      //        console.log(fns.nice(transactions));
      return _.filter(transactions, t => {
        var input = _.get(t, 'input');
        var isDeposit = false;
        _.each(depositMethodCodes, code => {
          if (_.startsWith(input, _.toLower(code))) {
            isDeposit = true;
          }
        })
        return isDeposit;
      });
    });
}


function depositsToContract({ chainID, contractAddress, address }) {
  return deposits({ chainID, address, numTransactions: 300 })
    .then(transactions => {
      var contractTransactions = _.filter(transactions, t => {
        var to = _.get(t, 'to');
        return _.toUpper(to) == _.toUpper(contractAddress);
      });
      return contractTransactions;
    });
}

function addressDeposits({ address, pages, numTransactions }) {
  var map = {};
  return Promise.all(_.map(chains.all, chainID => {
    return deposits({ chainID, address, numTransactions })
      .then(arr => {
        map[chainID] = arr;
      });
  })).then(() => {
    return map;
  });

}

module.exports = {
  get,
  depositsToContract,
  addressDeposits
};
