
var _ = require('lodash');

var geckoClient = require('../module/gecko-client.js');
var web3 = require('../module/web3-client.js');
const chains = require('../module/chains.js');
var moralisClient = require('./moralis-client.js');
var ccxt = require('./ccxt-proxy.js');
var cache = require('../module/cache.js');



function get(o) {
  var nativeCurrency = _.get(chains, `${o.chainID}.native`);
  if (!_.isString(o.chainID)) {
    return Promise.reject('no chainID string');
  }
  if (_.isEmpty(_.compact(_.get(o, 'tickers')))) {
    // use native currency
    var flat = _.flatten([o.ticker, [nativeCurrency]]);
    o.tickers = _.compact(flat);
  }
  var balanceMap = {};
  var errorsMap = {};
  var promises = _.map(o.tickers, ticker => {
    //    ticker = _.toUpper(ticker);
    var isNativeToken = false;
    var p;
    if (ticker.toUpperCase() == nativeCurrency) {
      isNativeToken = true;
      p = web3.tokenBalance(o).then(n => {
        balanceMap[ticker] = n;
        return Promise.resolve();
      });
    } else {
      //p = Promise.reject('forcing moralis');

      p = geckoClient.tickerContract(o.chainID, ticker)
        .then(contractAddress => {
          if (_.isString(contractAddress) && _.size(contractAddress) > 0) {
            return web3.tokenBalance(_.extend(o, { contractAddress }))
              .then(n => {
                balanceMap[ticker] = n;
                return Promise.resolve();
              })
              .catch(err => {
                errorsMap[ticker] = err;
                return Promise.resolve();
              });
          } else {
            return Promise.reject("no contract address found for " + ticker);
          }
        });
    }

    return p.catch((err) => {
      var error = _.get(err, 'response.statusText', _.get(err, 'response.status', err));
      if (isNativeToken) {
        //console.error(`trying moralis instead for ${o.chainID} native token`);
        return moralisClient.nativeBalance(o.address, o.chainID)
          .then(n => {
            balanceMap[ticker] = n;
            return Promise.resolve();
          })
          .catch((err) => {
            errorsMap[ticker] = 'moralis native balance failed';
            return Promise.resolve();
          });
      } else {
        console.error(`trying moralis instead for ${o.chainID} ${ticker} because:`, error);
        return moralisClient.balance(_.extend(o, { ticker }))
          .then(n => {
            balanceMap[ticker] = n;
            return Promise.resolve();
          })
          .catch((err) => {
            errorsMap[ticker] = 'moralis erc20 balance failed: ' + _.isString(err) ? err : '';
            return Promise.resolve();
          });
      }
      //          console.log(`no balance found for ${ticker} so returning 0`);
    })
  });

  return Promise.all(promises).then(result => {

    return {
      address: o.address,
      chainID: o.chainID,
      balance: balanceMap,
      nativeCurrency,
      nativeBalance: _.get(balanceMap, nativeCurrency, _.get(balanceMap, _.toLower(nativeCurrency), null)),
      errors: errorsMap
    };
    //    return _.sum(result);
  });
}

var exchangeCache = {};

function cexBalances(o) {
  if (_.isString(o.userKey) && _.isString(o.exchange)) {
    var cacheKey = `${o.userKey}-${o.exchange}`;
    var balances = cache.check(cacheKey);
    if (_.isObject(balances)) {
      return Promise.resolve(balances);
    } else {
      return ccxt.call(_.extend(o,
        {
          methodLevel1: 'fetchBalance'
        })
      ).then(b => {
        return cache.set(cacheKey, b);
      });
    }
  } else {
    return Promise.reject('please specify userKey');
  }
}

function cexGet(o) {
  return cexBalances(o)
    .then(balances => {
      var type = o.balanceType ? o.balanceType : 'total';
      var tokenBalances = _.get(balances, _.toUpper(o.ticker));
      if (_.isObject(tokenBalances) && _.isNumber(_.get(tokenBalances, type))) {
        return tokenBalances[type];
      } else {
        return 0;
      }
    })
}

module.exports = {
  get: (o) => get(o).catch((e) => "balance.get failed: " + e),
  getNumber: (o) => get(o)
    .then(b => {
      if (_.get(o, 'ticker')) {
        return _.get(b, o.ticker)
      } else {
        return _.get(b, 'nativeBalance');
      }
    }).catch((e) => "balance.get failed: " + e),
  cexGet
};
