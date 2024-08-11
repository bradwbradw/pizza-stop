

import _ from 'lodash';
import geckoClient from '../module/gecko-client.mjs';
import web3 from '../module/web3-client.js';
import chains from '../module/chains.js';
import cache from '../module/cache.js';


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
        balanceMap[ticker] = Number(n);
        return Promise.resolve();
      });
    } else {
      //p = Promise.reject('forcing moralis');
      console.log("trying gecko for", ticker, "on", o.chainID, "for", o.address, "with", o.userKey, "and", o.exchange);
      p = geckoClient.tickerContract(o.chainID, ticker)
        .then(contractAddress => {
          if (_.isString(contractAddress) && _.size(contractAddress) > 0) {
            return web3.tokenBalance(_.extend(o, { contractAddress }))
              .then(n => {
                balanceMap[ticker] = Number(n);
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
      return Promise.reject(error);
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



export default {
  get: (o) => get(o).catch((e) => "balance.get failed: " + e),
  getNumber: (o) => get(o)
    .then(b => {
      if (_.get(o, 'ticker')) {
        return _.get(b, o.ticker)
      } else {
        return _.get(b, 'nativeBalance');
      }
    }).catch((e) => "balance.get failed: " + e)
};
