
if (!ko || !_ || !moment) {
  var ko = {};
  var _ = {};
  var moment = {};
  console.error("dependencies failed:", ko, _, moment);
}

var httpRequest = function (url, params, opts) {
  var paramArr = _.map(_.toPairs(params), pair => {
    var key = _.first(pair);
    var val = _.last(pair);
    if (_.isFunction(_.get(val, 'format'))) {
      return key + "=" + val.toISOString()
    }
    if (_.isObject(val) || _.isArray(val)) {
      return key + "=" + JSON.stringify(val);
    } else {
      return key + "=" + val;
    }
  });
  var urlWithParams = url + "?" + _.join(paramArr, "&");
  if (_.size(_.split(url, '?')) > 1) {
    urlWithParams = url;
  }

  return fetch(urlWithParams, _.extend({}, opts))
    .then(response => {
      if (response.status >= 200 && response.status < 300) {
        return response.json();
      } else {
        return response.json()
          .then(json => {
            return Promise.reject(_.extend(response, { json }));
          });
      }
    })
}

var Api = {
  asset: ticker => {
    return httpRequest('/price/' + ticker);
  },
  contractBalance: params => {
    return httpRequest('/contract-balance', params);
  },
  abi: params => {
    return httpRequest('/abi', params);
  },
  httpRequest
}

//ccxt trade history

/*
function cleanTrades(ts){
  return _.map(ts, t =>{
    return _.pick(t,"datetime symbol side price amount".split(' '));
  })
}

*/
