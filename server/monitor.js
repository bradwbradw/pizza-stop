
var balance = require('./balance.js');
var assetData = require('./asset-data');
var notify = require('./notify.js');
var googleSheets = require('./google-sheets.js');

var geckoClient = require("../module/gecko-client.js");
var web3 = require("../module/web3-client");
var chains = require('../module/chains.js');
var swap = require('../module/swap.js');
var cache = require('../module/cache.js');
var xen = require('../module/xen.js');

var _ = require('lodash');
var moment = require('moment');
var Agenda = require('agenda');

var userKey = process.env.SECRET;

const mongoConnectionString = process.env.MONGO;//"mongodb://127.0.0.1/agenda";

var agenda;

if (_.isString(mongoConnectionString)) {

  agenda = new Agenda({
    db: { address: mongoConnectionString }, options: {
      ssl: true
    }
  });
}

function getMonitorData(key) {
  //  console.log('getMonitorData', key);
  var obj = cache.checkPersistent('monitor-data') || {};
  return _.get(obj, key);
}

function setMonitorData(key, value) {
  //  console.log('setMonitorData', key, value);
  var obj = cache.checkPersistent('monitor-data') || {};
  _.set(obj, key, value);
  cache.setPersistent('monitor-data', obj);
}


var jobMap = {
  'clear gecko asset keys': {
    enabled: true,
    interval: "1 week",
    action: () => {
      cache.clearPersistent('gecko-coin-list')
      return {
        message: 'cleared the gecko asset keys'
      }
    }
  },
  'update-assets': {
    enabled: true,
    interval: "55 minutes",
    action: () => {
      return googleSheets.sheetTickers()
        .then(assetData.addTickers)
        .then(assetData.updateAll)
        .then(googleSheets.printPrices)
    },
    condition: null,
    //    action: null
  },
  'check usdt': {
    enabled: false,
    interval: "24 hours",
    fetch: () => balance.cexGet({
      exchange: 'kucoin',
      ticker: 'usdt',
      balanceType: 'free',
      userKey
    }).then(result => {

      return {
        message: `${moment().format()} kucoin usdt balance is ${result}`
      }
    })
  },
  'dca': {
    enabled: false,
    //    interval: '14 days',
    fetch: () => {
      console.log('fetching dca...');
      return swap.prepare({
        spendTicker: 'USDC',
        baseTicker: 'MAGIC',
        spendAmount: 7,
        chainID: '42161'
      });

    },
    condition: (swap) => {
      return _.get(swap, 'pricesResponse.priceRoute.gasCostUSD', 99) < 1;
    },
    action: ({ pricesResponse }) => {

      if (_.isObject(pricesResponse)) {
        return swap.execute(
          pricesResponse,
          process.env.BRAD_STEPN_BSC,
          process.env.BRAD_STEPN_MNEMONIC,
          process.env.BRAD_T,
          8.6
        );
      } else {
        return {
          message: 'bad pricesResponse'
        };
      }
    }
  },
  'xen': {
    enabled: true,
    interval: '25 minutes',
    fetch: () => {
      //      return xen.xenCheck([11], ["43114"]);
      return xen.xenCheck(_.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]), _.shuffle(["43114"]));
    },
    condition: (result) => {
      if (_.isObject(result) && result.chainID && result.address) {
        return true;
      } else {
        return false;
      }
    },
    action: (result) => {
      var { chainID, address, addressIndex, maturity } = result;

      var claimRanksFn = () => xen.claimRanks(chainID, [addressIndex], 365);
      if (maturity === '0') {
        console.log('do claim ranks for ', chainID, address);
        return claimRanksFn().then(() => {

          return { message: `did claim rank ${chainID} ${address}` };
        });
      } else {
        console.log('do harvest and claim ranks for ', chainID, address);

        return xen.harvestXen(chainID, [addressIndex]).then(() => {
          return claimRanksFn();
        }).then(() => {
          return { message: `did harvest and claim rank ${chainID} ${address}` };
        })
      }
    }
  },
  'stepn': {
    enabled: true,
    interval: "100 minutes",
    fetch: () => {
      var o = {
        tickers: ['GST-BSC'],
        chainID: '56',//bscChainID(),
        address: process.env.BRAD_STEPN_BSC
      }
      return balance.get(o)
        .then(result => {
          return swap.prepare({
            spendTicker: 'GST-BSC',
            baseTicker: 'USDC',
            spendAmount: _.get(result, 'balance.GST-BSC', 0),
            chainID: '56'
          });
        })
    },
    condition: (swap) => {
      console.log('stepn swap', swap);
      var usd = _.get(swap, 'pricesResponse.priceRoute.destUSD') * 1;

      return _.isNumber(usd) && usd > 5.50;
    },
    action: ({ pricesResponse }) => {

      return swap.execute(
        pricesResponse,
        process.env.BRAD_STEPN_BSC,
        process.env.BRAD_STEPN_MNEMONIC,
        process.env.BRAD_T,
        8
      );
    },
    failMessage: (result) => {
      var msg = "error during GST sell";
      var o = {
        msg
      };
      _.extend(o, {
        result
      });
      try {
        return JSON.stringify(o, null, 2);
      } catch (err) {
        return msg;
      }
    }
  },
};

function delay(ms) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, ms);
  });
}

function job(name, check) {
  console.log(`executing job: ${name}`);
  var step = 'fetch';

  function doAction(result) {
    var finish = (result) => {
      if (_.isString(_.get(result, 'message'))) {
        notify.notify(result.message);
      }

      return Promise.resolve();
    };

    if (_.isFunction(_.get(check, 'action'))) {
      step = 'action';

      //console.log(name, step);
      var maybeAPromise = check.action(result);
      if (maybeAPromise.then) {
        return maybeAPromise
          .catch(e => {
            if (e == 'retry') {
              return delay(10 * 1000).then(() => {
                console.log(`retrying ${name} action now`);
                return check.action(result);
              });
            } else {
              return Promise.reject(e);
            }
          })
          .then(finish)
      } else {
        return finish(maybeAPromise);
      }
    } else {
      return Promise.resolve(result);
    }
  }

  function doFetch() {
    if (_.isFunction(_.get(check, 'fetch'))) {
      //console.log(name, step);
      return check.fetch();
    } else {
      //console.log(name, 'no fetch found');
      return Promise.resolve();
    }
  }
  return doFetch().catch(e => {
    if (e == 'retry') {
      console.log('retrying ...');
      return delay(3000).then(check.fetch);
    } else {
      return Promise.reject(e);
    }
  }).then(result => {
    if (_.isFunction(check.condition)) {

      var conditionCheckResult = check.condition(result);
      if (
        _.isBoolean(conditionCheckResult) &&
        conditionCheckResult
      ) {
        if (_.isFunction(_.get(check, 'action'))) {
          return doAction(result);
        } else {
          return Promise.resolve(result);
        }
      } else if (!conditionCheckResult) {
        console.log(`${name} condition result was ${conditionCheckResult}`);
      } else if (
        _.isObject(conditionCheckResult) &&
        conditionCheckResult.message) {
        console.log('notifying', conditionCheckResult);
        notify.notify(conditionCheckResult.message);
      } else {
        console.error("confusing condition check result object", conditionCheckResult);
      }
    } else if (_.isString(_.get(result, 'message'))) {
      notify.notify(result.message);
    } else {
      return doAction().then(result => {
        if (_.isString(_.get(result, 'message'))) {
          notify.notify(result.message);
        } else {
          notify.notify(`task completed: ${name}`);
        }
      })
    }
    return Promise.resolve();
  }).catch(err => {
    if (_.isString(_.get(err, 'message'))) {
      notify.notify(`${name} ${step} failed: ${err.message}`);
      console.error(`${name} ${step} failed: ${err.message}`);
    } else {
      console.error(err);
    }
    return Promise.resolve();
  });
}

function startSchedule() {
  interval = {};

  //dev aid
  var focused = _.pickBy(jobMap, (check, name) => _.get(check, 'runThisOnly'));
  //  console.log("11111", focused);
  if (_.size(focused) > 0) {
    var focus = _.toPairs(focused)[0][1];
    var name = _.toPairs(focused)[0][0];
    //    console.log("22222", focus);
    //    console.log(`only running "${name}" monitor`);
    jobMap = focused;
    job(name, focus);
  } else if (agenda) {
    // prod behaviour

    agenda.start()
      .then(() => {
        var goodChecks = _.pickBy(jobMap, 'enabled');
        return Promise.all(_.map(goodChecks, (check, name) => {
          console.log('defining check ', name);
          agenda.define(name, () => {
            console.log("JOB START", name);
            return job(name, check).then(() => {
              console.log("JOB COMPLETE", name);
            });
          });

          return agenda.every(check.interval, name);
        }));
      });
  } else {
    console.log('no mongo url, so cannot start monitor schedule');
  }

}

function runJobOnce(name) {
  if (_.isObject(jobMap[name])) {
    notify.notify(moment(new Date()).format() + " " + name);
    return job(name, jobMap[name]);
  } else {
    return Promise.reject("no job with that name: " + name);
  }
}


module.exports = {
  startSchedule,
  runJobOnce
}