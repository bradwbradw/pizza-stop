var _ = require('lodash');
var moment = require('moment');
const SwaggerClient = require('swagger-client');

var chains = require('../module/chains.js');
var cache = require('../module/cache.js');

var queue = require('../module/queue.js');
var Moralis = require('moralis/node');

var MoralisRestApi;

//var serverUrl = process.env.MORALIS_SERVER;
//var appId = process.env.MORALIS_APP_ID;
var restKey = process.env.MORALIS_KEY;
//if (_.isString(serverUrl) && _.isString(appId)){
//Moralis.start({serverUrl, appId});
//} else {
//console.log('need more env vars for moralis.');

//}

function nice(a) {
  return a;
  return JSON.stringify(a, null, 2);
}

function accountBalances(address, chainID) {
  //console.log(`looking up account balances for ${address} on chain ${chainID}...`);
  var cacheKey = `balances-${address}-${chainID}`;
  var cached = cache.check(cacheKey);
  if (cached) {
    return Promise.resolve(cached);
  } else {
    console.log('REST to moralis');
    return MoralisRestApi.then(m => {
      return queue.queuedTask(() => {
        return m.apis.account.getTokenBalances(
          {
            address,
            chain: _.get(chains, `${chainID}.lookup`)
          })
      }, 'moralis', 260)
        .then(r => {
          //console.log(`got ${_.size(r.body)} balances for ${address} on chain ${chainID}...`);
          cache.set(cacheKey, r.body);
          return r.body;
        })
    })
      .catch(err => {
        console.error("moralis balance check failed: ", err);
      })
  }
}


function balance({ ticker, chainID, address, contractAddress }) {
  //console.log(`moralis balance lookup for ticker ${ticker} chain ${chainID} address ${address} contract ${contractAddress}`);
  if (!address) {
    return Promise.reject("no address was given");
  }
  if (!ticker) {
    return Promise.reject("no ticker was given");
  }
  return accountBalances(address, chainID)
    .then(arr => {
      //console.log(`${chainID} ${address} balances`)
      var o = _.find(arr, entry => { return _.get(entry, 'symbol', '').toUpperCase() == ticker.toUpperCase(); });
      if (_.isObject(o)) {
        var decimals = parseInt(o.decimals);
        if (_.isNumber(decimals)) {
          var n = o.balance / (10 ** decimals);
          //console.log('found balance for '+ticker+" from moralis "+n);
          return n;
        } else {
          return Promise.reject("moralis balance not found. got decimal: " + decimals);
        }
      } else {
        //        console.log(`moralis balance for ${chainID}, ${ticker} is not in here? ${JSON.stringify(arr, null, 2)}`);
        return Promise.reject(`moralis balance not found for address ${address} chain ${chainID} ticker ${ticker}`);
      }
    })
    .catch(err => {
      console.error(err);
      return Promise.reject(err);
    })
}

function nativeBalance(address, chainID) {
  return MoralisRestApi.then(m => {
    return m.apis.account.getNativeBalance(
      {
        address,
        chain: _.get(chains, `${chainID}.lookup`)
      })
      .then(r => {
        console.log(r.body);
        return _.get(r.body, 'balance', 0) / (10 ** 18);
      })
  })
}

function setup(d) {

  MoralisRestApi = SwaggerClient(`http://${d}/moralis-swagger.json`, {
    requestInterceptor: req => {
      //if(req.url === swaggerUrl) {
      // we're fetching the definition
      req.headers['X-API-Key'] = restKey;
      //}

      return req
    }
  });
  return MoralisRestApi.then((m) => {
    //console.log("moralis api ready");
  }).catch(err => {
    console.log("moralis api error " + err);
  });

}
module.exports = {
  setup,
  balance,
  nativeBalance
}
