
var _ = require('lodash');
var moment = require('moment');
const { promise } = require('when');
var ccxt = require('./ccxt-proxy.js');
const db = require('./db.js');

// https://github.com/ccxt/ccxt/blob/master/examples/js/exchange-capabilities.js#L22

var exchangePreferences = "binance okx kucoin coinbase gateio huobi ftx kraken bitfinex mexc".split(' ');


var exchangeDoesNotHavePairMap = {
  //exchange:[pair,pair, ...]
  //binance:['KCS/USDT'] 
};
module.exports = app => {

  app.get("/price-data", (request, response) => {

    _.defaults(request.query, {
      currency: 'ETH',
      quoteCurrency: 'USDT',
      beginDate: moment().subtract(1, 'hour'), // -1 hour from now
      endDate: moment(),
      tradesPerMinute: 0.2,
      params: {}
    });

    var millis;
    var end;

    try {
      var millis = parseInt(moment(request.query.beginDate).format('x'));
      var end = parseInt(moment(request.query.endDate).format('x'));
    } catch (err) {
      console.error("bad dates", err);
    }

    console.log(JSON.stringify({ millis }, null, 2));
    var interval = _.round(60000 / request.query.tradesPerMinute);
    console.log(`${request.query.tradesPerMinute} trades per minute works out to a ${interval} ms interval`)
    var fetches = _.range(millis, end, interval);

    if (_.isNumber(millis) && _.isNumber(end)) {

      getPrices(request.query, fetches)
        .then(r => {
          response.json(r);
        })
        .catch(err => {
          response.status(400).json(err);
        })
    } else {
      response.status(400).json({ message: `got start millis "${millis}" and end millis "${end}"` })
    }

  });

  function getPrices(query, milliList) {
    return new Promise((resolve, reject) => {
      db({
        currency: query.currency,
        quoteCurrency: query.quoteCurrency
      })
        .then(db => {
          var p = Promise.resolve();
          var data = [];

          _.each(milliList, m => {
            p = p.then(() => { return getCacheOrFetch(db, m); })
              .then((d) => {
                //            console.log("new data", d);
                data.push(d);
                console.log(100 * _.size(data) / _.size(milliList), '%...');
                return d;
              })
              .catch((err) => {

                console.log(err);
                reject(err);
              });
          });

          p = p.then((d) => {
            resolve(
              { 
                prices: data,
                mean: _.meanBy(data, 'price'),
                exchange: _.get(d,'exchange', '?')
              });
          });
        })
        .catch(reject);

    });
  }

  function getCacheOrFetch(db, m) {

    var exch;
    return new Promise((resolve, reject) => {
      db.get(m)
        .then(result => {
          if (result) {
            console.log('cached', result);
            resolve(result);
          } else {
            fetchData({
              symbol: `${db.currency}/${db.quoteCurrency}`,
              since: m,
              limit: 1,
              params: {}
            })
              .then(data => {
                exch = _.get(data,'exchange','?');
                var price = _.get(_.first(data), 'price');
                if (_.isNumber(price)) {
                  //            console.log('saving', m, price);
                  db.upsert([{ millis: m, price }])
                    .then(resolve)
                    .catch(reject);

                } else {
                  reject('bad price fetched from bitfinex: ' + price)
                }
              })
              .catch(reject);
          }
        })
        .catch(reject);
    })
    .then(x => {
      return _.extend(x, {exchange:exch});
    });
  }

  function fetchBatch({ symbol, millis, end }) {
    return fetchData({ symbol, since: millis })
      .then(trades => {
        millis = _.get(_.last(trades), 'timestamp');
        if (millis < end) {
          return fetchBatch({ symbol, millis, end })
            .then(trades2 => {
              return _.union(trades, trades2);
            })
        } else {
          console.log('done. ' + _.size(trades) + ' trades found');
          return trades;
        }
      })
  }

  function fetchData({ symbol, since, limit, params }) {

    var p = Promise.resolve();
    var exchangeFoundIt = false;
    _.each(exchangePreferences, exchange => {
      var exchangeMissingPairs = _.get(exchangeDoesNotHavePairMap, exchange,[]);
      if (_.includes(exchangeMissingPairs,symbol)){
        // skip. exchange does not have the pair
      } else {

        p = p.then((x) => {
          if (exchangeFoundIt) {
            return Promise.resolve(_.extend(x, { exchange: exchangeFoundIt }));
          } else {
            console.log('requesting price...', { exchange, symbol, since, limit, params });
            return ccxt.call({
              exchange,
              methodLevel1: 'fetchTrades',
              params: [symbol, since, limit]
            })
              .then((r) => {
                exchangeFoundIt = exchange;
                return r;
              })
              .catch((err) => {
                if (_.get(err, 'message')){
                  err = err.message;
                }
                console.log(`${exchange} ${symbol} failed: ${err}`);
                _.set(exchangeDoesNotHavePairMap, exchange, _.union(exchangeMissingPairs, [symbol]));
                if (!exchangeFoundIt && exchange == _.last(exchangePreferences)) {
                  return Promise.reject(`all exchanges failed to find ${symbol} since ${since}, limit ${limit}`)
                }
                return Promise.resolve();
              })
          }
        });
      }
    });
    return p;//.then(cleanTrades);
  }

}
