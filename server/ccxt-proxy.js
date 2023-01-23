
//const fs = require("fs");
//const path = require("path");
const _ = require("lodash");
const moment = require("moment");
const when = require("when");
const ccxt = require("ccxt");

const user = require("./user.js");

var exchanges = {};
var userExchanges = {};

function getExchangeLib(exchange, userKey) {
  return new Promise((resolve, reject) => {

    if (userKey) {

      var lib = _.get(userExchanges, `${userKey}.${exchange}`);
      if (!_.isObject(lib)) {
        var e = _.get(ccxt, exchange);
        user({ apiKey: userKey })
          .then(user => {

            if (_.isFunction(e) && _.isString(_.get(user, `exchangeKeys.${exchange}.apiKey`))) {
              console.log('making new cctx lib for ' + exchange);
              lib = new e({
                enableRateLimit: true,
                apiKey: user.exchangeKeys[exchange].apiKey,
                secret: user.exchangeKeys[exchange].secret,
                password: _.get(user, `exchangeKeys.${exchange}.password`, '')
              });
              _.set(userExchanges, `${userKey}.${exchange}`, lib);

              lib.tradesSince = function (symbol, sinceIsoDateString) {

                return new Promise(async (resolve, reject) => {
                  // JavaScript
                  if (lib.has['fetchMyTrades']) {
                    //let since = exchange.milliseconds () - 86400000 // -1 day from now
                    // alternatively, fetch from a certain starting datetime
                    let since = lib.parse8601(sinceIsoDateString)
                    let allTrades = []
                    while (since < lib.milliseconds()) {
                      const limit = 20 // change for your limit
                      const trades = await lib.fetchMyTrades(symbol, since, limit)
                      if (trades.length) {
                        since = trades[trades.length - 1]['timestamp'] + 1
                        allTrades = allTrades.concat(trades)
                      } else {
                        break
                      }
                    }
                    resolve(allTrades);
                  }
                })
              }
              resolve(lib);
            } else {
              reject(new Error(`cannot get user exchange lib "${exchange}" for key ${userKey}`));
            }
          })
          .catch(err => {
            reject(err);
          });
      } else {
        resolve(lib);
      }
    } else {
      var lib = _.get(exchanges, exchange);
      if (!_.isObject(lib)) {
        var e = _.get(ccxt, exchange);
        if (_.isFunction(e)) {
          console.log("making new exchange lib " + exchange);
          lib = new e({ enableRateLimit: true });
          _.set(exchanges, exchange, lib);
        }
      }

      resolve(lib);
    }
  });
}

function callCcxtMethod(methodPathParts, exchangeLib, fnParams) {

  //  console.log(methodPathParts);
  var params = _.filter(methodPathParts, _.isString);
  var fnPath = params.join(".");

  var r;
  // console.log("params", JSON.stringify(fnParams, null, 2));

  if (_.isFunction(exchangeLib[fnPath])) {
    if (_.isArray(fnParams)) {
      r = exchangeLib[fnPath](...fnParams);
    } else {
      r = exchangeLib[fnPath]();
    }
  } else if (_.isFunction(ccxt[fnPath])) {
    if (_.isArray(fnParams)) {
      r = ccxt[fnPath](...fnParams);
    } else {
      r = ccxt[fnPath]();
    }
  } else if (_.isObject(ccxt[fnPath]) || _.isArray(ccxt[fnPath])) {
    r = Promise.resolve(ccxt[fnPath]);
  } else {
    r = Promise.reject({
      message: `unable to find fn for exchange, fnPath ${fnPath}`
    });
  }

  if (when.isPromiseLike(r)) {
    return r;
  } else {
    console.log(
      `ccxt function at path ${exchange}.${fnPath} did not return a promise`
    );
    //      res.json(r);
    return Promise.resolve(r);
  }
}

function call({ exchange, methodLevel1, userKey, params }) {
  return getExchangeLib(exchange, userKey)
    .then(lib => {

      if (_.isObject(lib)) {
        //        console.log(lib);
        return callCcxtMethod([methodLevel1], lib, params);
      } else {
        return Promise.reject("could not get ccxt lib for " + exchange);
      }
    })
}



var excludeTickers = 'USDT USD LUNA2/LOCKED LUNA2 LUNC LUNA2_LOCKED'.split(' ');

function portfolio({ key, exchange = 'kucoin', sinceDateGMT }) {

  return getExchangeLib(exchange, key)
    .then(exch => {
      return exch.fetchBalance()
        .then(balance => {
          return Promise.all(_.map(_.filter(_.toPairs(balance.free), pair => pair[1] > 0 && !_.includes(excludeTickers, pair[0])), bal => {
            var ticker = bal[0];
            var balance = bal[1];
            console.log('t since', sinceDateGMT);
            return Promise.all([exch.tradesSince(`${ticker}/USDT`, sinceDateGMT)
              .catch(err => {
                console.error(err.message);
                return Promise.resolve([]);
              }),
            exch.fetchTicker(`${ticker}/USDT`)])
              .then(([t, p]) => {

                var price = p.last;
                var buys = _.filter(t, { side: 'buy' });
                var sells = _.filter(t, { side: 'sell' });
                var buyAmount = _.sumBy(buys, 'amount');
                var buyCost = _.sumBy(buys, 'cost');
                var buyAvg = _.round(buyCost / buyAmount, 8);
                var sellAmount = _.sumBy(sells, 'amount');
                var sellCost = _.sumBy(sells, 'cost');

                var value = balance * price;
                var profit = _.round(value - (buyAvg * balance), 2);
                return {
                  ticker,
                  price,
                  //buys,
                  //sells,
                  buyAmount,
                  buyCost,
                  buyAvg,
                  sellAmount,
                  sellCost,
                  value,
                  available: balance,
                  profit
                };
                //              return [_.map(t, tr => _.pick(tr, 'datetime symbol side price amount cost'.split(' '))),p];
              })
          })).then(all => {
            return _.filter(_.reverse(_.sortBy(all, 'profit')), x => _.isNumber(x.profit) && !_.isNaN(x.profit));
          })
        })
        .catch(err => {
          console.error(err);
        })

    })
    .catch(err => {
      console.error(err);
    })
}



module.exports = {
  portfolio,
  setupRoutes: app => {
    app.get('/ccxt/:exchange/:methodLevel1', (req, res) => {
      call({
        exchange: req.params.exchange,
        methodLevel1: req.params.methodLevel1,
        userKey: req.query.userKey,
        params: req.query.params
      })
        .then(r => {
          res.json(r);
        })
        .catch(err => {
          console.error(err);
          res.status(500).json({ err: "something went wrong" });
        })
    });
  },
  call
}
