
var _ = require('lodash');
const moment = require('moment');
const SwaggerClient = require('swagger-client');

var queue = require('./queue.js');
var cache = require('./cache.js');
var chains = require('./chains.js');

var chainPairs = _.toPairs(chains);

var preferred = "equalizer-dex alethea-artificial-liquid-intelligence-token bird-money solidlydex magic usd-coin gmx metaland-gameverse stepn thorchain jade-protocol pancakeswap-token the-sandbox ufo-gaming monavale harmony wonderland ice-token binancecoin spookyswap gitcoin qi-dao mimatic".split(" ");

var fields = 'id symbol platforms categories name public_notice additional_notices description links image market_data.market_cap.usd market_data.market_cap.btc community_data.twitter_followers market_data.total_value_locked.usd market_data.total_value_locked.btc sentiment_votes_up_percentage market_cap_rank market_data.price_change_percentage_7d market_data.price_change_percentage_24h market_data.price_change_percentage_30d'.split(' ');

var GeckoApi;

var geckoCoins;

var timeout = 10000;

var geckoCacheKey = 'gecko-coin-list';
var geckoCoins = cache.checkPersistent(geckoCacheKey);
if (_.isEmpty(geckoCoins)) {
  geckoCoins = [];
}

function geckoIDFromTicker(ticker) {
  var list = _.get(geckoCoins, ticker, []);
  var id = _.first(list);
  _.each(list, idCandidate => {
    //    console.log('id candidate', idCandidate);
    if (_.includes(preferred, idCandidate)) {
      id = idCandidate;
    }
  });
  console.log(`selected gecko api id ${id} for ticker ${ticker}`);
  return id;
}
function aGoodId(id) {
  return !_.includes(id, "-peg-");
}
function getGeckoCoins() {

  if (_.isEmpty(geckoCoins)) {

    return GeckoApi.then(g => {
      return g.apis.coins.get_coins_list().then(r => {
        var o = {};
        _.each(r.body, coin => {
          //          console.log(coin);
          var t = coin.symbol.toUpperCase();
          if (!_.get(o, t) && aGoodId(coin.id, false)) {
            _.set(o, t, [coin.id]);
          } else if (aGoodId(coin.id, false)) {
            _.set(o, t, _.flatten([_.get(o, t), [coin.id]]))
          }
        });
        return o;
      });
    }).then(coins => {
      console.log(`persisting ${_.size(coins)} gecko coins in map`);
      return cache.setPersistent(geckoCacheKey, coins);
    });
  } else {
    return Promise.resolve(geckoCoins);
  }
}

var retryAfter = 60000;
function doGeckoRequest({ ticker, chainID }) {
  return getGeckoCoins()
    .then(() => {
      var id = geckoIDFromTicker(_.toUpper(ticker));
      if (_.isString(id) && id != "") {

        //console.log("gecko api: get "+id+"...");
        return GeckoApi.then(g => {
          return new Promise((resolve, reject) => {

            g.apis.coins.get_coins__id_({ id })
              .then(resolve)
              .catch(err => {
                //if rate limit
                if (err.status == 429) {
                  reject('ratelimit');
                  var rs = _.get(err, 'response.headers.retry-after', '60');
                  var r = parseInt(rs);
                  if (_.isNumber(r)) {
                    retryAfter = r * 1000 + 50;
                    console.log('retry after ' + retryAfter);
                  }
                } else {
                  reject(err);
                }
              });
            setTimeout(() => reject(`gecko get ${id} timeout after ${timeout} ms`), timeout);
          })
            .then(r => {
              //            console.log(`${id} took ${moment().diff(t, "milliseconds")} ms`);
              return _.extend(r, { id });
            });
        })
      } else {
        return Promise.reject("unable to find gecko API id for: " + ticker);
      }
    });
}

var chainAddressTickerMapKey = "chain-address-ticker-map";
var tickerChainAddressMapKey = "ticker-chain-address-map";
var chainAddressTickerMap = cache.checkPersistent(chainAddressTickerMapKey);//{}; // example: {  250-0x1234: weth  }
var tickerChainAddressMap = cache.checkPersistent(tickerChainAddressMapKey);//{}; // example: {  weth-250: 0x12345 }

if (!chainAddressTickerMap) {
  chainAddressTickerMap = {};
  tickerChainAddressMap = {};
  persistMaps();
}

var persistMapsTimeout;
function persistMaps() {
  if (persistMapsTimeout) {
    clearTimeout(persistMapsTimeout);
  }
  persistMapsTimeout = setTimeout(() => {
    console.log("persisting maps");
    cache.setPersistent(chainAddressTickerMapKey, chainAddressTickerMap);
    cache.setPersistent(tickerChainAddressMapKey, tickerChainAddressMap);
  }, 5000);
}

function tickerFromContract(chainID, address) {
  return _.toUpper(_.get(chainAddressTickerMap, `${chainID}-${address}`, ""));
}

var geckoTimeout = 6010;
// Gecko free API has a rate limit of 10-50 calls per minute
// min 1200, max 6000 ms
function crosschainPrice(ticker) {

}

function asset(ticker, chainID) {
  return queue.queuedTask(
    () => {
      console.log('execute gecko.get with timeout ' + geckoTimeout, ticker);
      var cacheKey = `gecko-asset-${_.toLower(ticker)}`;
      var cached = cache.check(cacheKey);
      var p;

      if (cached) {
        p = Promise.resolve(cached);
      } else {
        p = doGeckoRequest({ ticker })
          .then(r => {
            console.log('setting cache ' + cacheKey);
            return cache.set(cacheKey, r);
          })
          .catch(err => {
            console.log(err);
            if (err == 'ratelimit' && geckoTimeout < 6000) {
              geckoTimeout = geckoTimeout + 1005;
              console.log('new gecko timeout ' + geckoTimeout);
              return new Promise((resolve, reject) => {
                setTimeout(resolve, 60000);
              })
                .then(() => {
                  return doGeckoRequest({ ticker })
                    .then(r => {
                      return cache.set(cacheKey, r);
                    })
                });
            } else {
              //?
            }
            // rate limited?
          })
      }
      return p.then(r => {

        if (chainID) {

          //var chainName = _.get(chains,`${chainID}.name`, '');
          var contract;// = _.get(r.body, `platforms.${chainName}`, null);
          var assetInfo = _.pick(r.body, fields);
          var platforms = _.get(r.body, 'platforms', {});
          _.each(platforms, (address, name) => {
            var pair = _.find(chainPairs, p => { return _.get(p[1], 'name') == name });
            if (pair && _.size(pair) == 2) {
              var id = pair[0];

              //            console.log('set tickerChAdM', ticker, id, address);
              _.set(tickerChainAddressMap, `${_.toLower(ticker)}-${id}`, address);
              _.set(chainAddressTickerMap, `${pair[0]}-${address}`, assetInfo.symbol);
              persistMaps();
              if (name == _.get(chains, `${chainID}.name`, '')) {
                contract = address;
              }
            }
          });
          return _.extend({
            contract,
            price: _.get(r, "body.market_data.current_price", { usd: "?" })
          }, assetInfo);
        } else {
          return _.extend({
            price: _.get(r, "body.market_data.current_price", { usd: "?" })
          }, assetInfo)
        }

      });
    },
    'gecko',
    geckoTimeout);
}

function tickerContract(chainID, ticker) {

  var address = _.get(tickerChainAddressMap, `${_.toLower(ticker)}-${chainID}`);
  if (_.isString(address)) {
    console.log('cache hit to get address of ', ticker, chainID);
    return Promise.resolve(address);
  } else {
    return asset(ticker, chainID)
      .then(assetData => {
        var chainKey = _.get(_.get(chains, chainID, {}), "name");
        if (_.isString(_.get(assetData, `platforms.${chainKey}`))) {
          return assetData.platforms[chainKey];
        } else {
          return Promise.reject(`no contract found for ${chainID} ${ticker}`);
        }
      });
  }
}

function setup(d) {

  domain = d;
  var geckoAPILocal = `http://${domain}/gecko-swagger.json`;
  GeckoApi = SwaggerClient(geckoAPILocal);
  GeckoApi.then(() => {
    //    console.log("gecko api ready");
  }).catch(err => {
    console.log("gecko api error " + err);
  });

}
module.exports = {
  asset,
  tickerContract,
  tickerFromContract,
  setup
}
