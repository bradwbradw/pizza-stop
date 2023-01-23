
var _ = require('lodash');
const moment = require('moment');

var chains = require('./chains.js');

var queueMap ={
  'gecko':[]
};

function queue(key){
  if (_.isArray(_.get(queueMap, key))) {
    return queueMap[key];
  } else {
    _.set(queueMap, key, []);
    return [];
  }
}

function processQueue(key, keepGoingAnyway){
  if (keepGoingAnyway){
    var q = queue(key);
    var first = _.first(q);
    first.go().then(() => {
      _.pullAt(q,[0]);
//      console.log("pulled from q. now "+_.size(q));
      if (_.size(q) > 0){
        processQueue(key, true);
      }
    });
  }
}

function queuedTask(promiseReturningWorkFn, queueKey, timeout){

  var startNow = _.size(queue(queueKey)) == 0;

  var promise0 = new Promise((resolve1, reject1) => {
  //  console.log(`pushing ${key} ${params}`);
    var objWithGo = {
      go:() => {
        return new Promise((resolve, reject) => {
          promiseReturningWorkFn()
            .then(response => {
      //              res.json(response);
              resolve1(response);
              setTimeout(resolve, timeout);
            })
            .catch(error => {
              console.log(_.truncate(error,{length:200}));
              reject1({error});
              setTimeout(resolve, timeout*2);
            })
        });
      }
    };
    queue(queueKey).push(objWithGo);
    processQueue(queueKey, startNow);
  });

  return promise0;

}

module.exports = {
  queuedTask
}
