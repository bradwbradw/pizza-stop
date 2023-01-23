var _ = require('lodash');
var gecko = require('../module/gecko-client.js');
var cache = require('../module/cache');

var mapKey = 'asset-data-map';


var map = cache.checkPersistent(mapKey);
if (_.isEmpty(map)) {
  map = {};
}
console.log('initial map', map);
function persistMap() {
  cache.setPersistent(mapKey, map);
  console.log('persisted', _.size(map));
  //console.log('persisted', map);
}
function persistTickers() {
  cache.setPersistent(tickersKey, tickers);
}

var assetData = {
  get: (ticker) => {
    return _.get(map, _.toLower(ticker));
  },
  updateAndGet: (ticker) => {
    return gecko.asset(ticker)
      .then(data => {
        var price = _.get(data, 'price.usd');
        if (_.isNumber(price)) {
          _.set(map, _.toLower(ticker), price);
          persistMap();
        } else {
          return Promise.reject('no number from gecko.asset');
        }
        return price;
      })
      .catch(err => {
        _.unset(map, _.toLower(ticker));
        persistMap();
        return promise.resolve(null);
      });
  },
  updateOrGet: (ticker) => {
    if (_.isNumber(assetData.get(ticker))) {
      return Promise.resolve(assetData.get(ticker));
    } else {
      return assetData.updateAndGet(ticker);
    }
  },
  updateAll: () => {
    return Promise.all(_.map(_.keys(map), assetData.updateAndGet)).then(() => {
      return map;
    })
  },
  addTickers: t => {
    console.log('add tickers', t);
    _.each(_.flatten([t]), ticker => {
      if (!_.isNumber(map[ticker])) {
        map[_.toLower(ticker)] = null;
      }
    });
    persistMap();
  },
  assets: (tickers) => {
    // future: if under heavy load, use updateOrGet,
    // otherwise, use updateAndGet for up-to-minute data
    tickers = _.flatten([tickers]);
    return Promise.all(_.map(tickers, assetData.updateOrGet)
    ).then(() => {
      return _.pick(map, tickers);
    })

  }

}

module.exports = assetData;