
if (!ko || !_ || !moment) {
  var ko = {};
  var _ = {};
  var moment = {};
  console.error("dependencies failed:", ko, _, moment);
}

var httpRequest = function(url, params, opts) {
  var paramArr = _.map(_.toPairs(params), pair => {
    var key = _.first(pair);
    var val = _.last(pair);
    if (_.isFunction(_.get(val,'format'))){
      return key + "=" + val.toISOString()
    }
    if (_.isObject(val) || _.isArray(val)){
      return key + "=" + JSON.stringify(val);
    } else {
      return key + "=" + val;
    }
  });
  var urlWithParams = url + "?" + _.join(paramArr, "&");

  return fetch(urlWithParams, _.extend({}, opts))
    .then(response => {
      if (response.status >= 200 && response.status < 300) {
        return response.json();
      } else {
        return Promise.reject();//"failed with status " + response.status);
      }
    });
}

var api = {
  user: (key) => {
    return {
      fetch:(pairs) => {
        if (_.isArray(pairs)){
          return httpRequest('user', {
            apiKey:key,
            pairArray:pairs
          });
        } else {
          return Promise.reject(new Error("please provide a list of pairs for this user"));
        }
      },
      trades:(exchange, pair) => {
        return httpRequest(`ccxt/${exchange}/fetchMyTrades`,{
          key,
          methodParams:[pair]
        })
        .catch(err => {
          return [];
        })
        .then(cleanTrades)
      }
    }
  }
}


function cleanTrades(ts){
  return _.map(ts, t =>{
    return _.pick(t,"datetime symbol side price amount".split(' '));
  })
}

//Window.httpRequest = request;
