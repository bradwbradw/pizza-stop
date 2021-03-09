
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
  user: (key)=>{
    return httpRequest('user', {
      apiKey:key,
      pairArray:['DOGE/BTC', 'LTC/BTC', 'HOT/ETH']
    })
  }
}

//Window.httpRequest = request;