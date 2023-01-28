var _ = require('lodash');
var moment = require('moment');

var localStorage = require('../shim/local-storage.js');

var cache_duration = 10; //minutes

var cache = {};

function check(key) {
  var now = moment();
  if (_.get(cache, key)) {
    var updated = cache[key].updated;
    var time = moment.duration(now.diff(updated)).as('minutes');
    if (time <= cache_duration) {
      console.log("return cached " + key);
      return cache[key].data;
    } else {
      console.log("cached but too old");
      return null;
    }
  } else {
    console.log(key + " not in cache");
    return null;
  }
}
function set(key, data) {
  _.set(cache, key, {
    updated: moment(),
    data
  });

  return data;
}


function checkPersistent(key) {
  var cached = localStorage.getItem(key);
  if (_.isString(cached)) {
    var obj;
    try {
      obj = JSON.parse(cached);
      return obj;
    } catch (error) {
      return cached;
    }
  } else {
    return null;
  }
}

function setPersistent(key, data) {
  if (_.isString(data)) {
    localStorage.setItem(key, data);
    return data;
  } else if (_.isObject(data) || _.isArray(data)) {
    var str;
    try {
      str = JSON.stringify(data);
      localStorage.setItem(key, str);
      return data;
    } catch (err) {
      throw new Error(err);
    }
  } else {
    console.log('will not save that data ' + key + ' to cache');
  }
}

function clearPersistent(key) {
  localStorage.setPersistent(key, null);
}

module.exports = {
  check,
  set,
  checkPersistent,
  setPersistent,
  clearPersistent
}

