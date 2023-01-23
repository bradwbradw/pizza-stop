

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


var checks = {
  'notif test start in 30 secs': {
    enabled: false,
    fetch: () => Promise.resolve({ message: `notif test 1 minute ${moment()}` }),
    //interval: "1 minute",
    startTime: moment().add(30, 'seconds').toDate()
  },
  //extend to check all native token balances
  'check ftm': {
    //runThisOnly: true,
    enabled: false,
    interval: "45 minutes",
    fetch: () => {
      return balance.getNumber({
        chainID: "250",
        address: process.env.BRAD_T
      }).then(b => {
        console.log("b", b);
        return b;
      });
    },
    condition: (balance) => {
      var existing = getMonitorData("check ftm");
      var dec8 = getMonitorData("check FTM Dec 8");
      if (existing && existing < balance) {
        setMonitorData("check ftm", balance);
        return { message: `FTM balance increased from ${existing} to ${balance} (Dec 8:${dec8})` };
      } else if (existing) {
        return false;
      } else {
        setMonitorData("check ftm", balance);
        setMonitorData("check FTM Dec 8", balance);
        return { message: `FTM balance baseline persisted: ${balance}` };
      }
    }
  },
  'update asset data': {
    enabled: true,
    interval: "29 minutes",
    fetch: () => {
      return googleSheets.sheetTickers()
        .then(assetData.addTickers)
        .then(assetData.updateAll)
        .then(googleSheets.printPrices)
    },
    condition: null,
    action: null
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
    startIn: "5 milliseconds",
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
      }
    }
  },
  'xen': {
    enabled: true,
    interval: '50 minutes',
    //startTime: moment().add(1, "seconds").toDate(),
    fetch: () => {
      //      return xen.xenCheck([11], ["43114"]);
      return xen.xenCheck(_.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]), _.shuffle(["43114", "137", "1284"]));
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

      var claimRanksFn = () => xen.claimRanks(chainID, [addressIndex], 128);
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
    interval: "35 minutes",
    //startTime: moment().add(0.0000001, "minutes").toDate(),
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
      var usd = _.get(swap, 'value');

      return _.isNumber(usd) && usd > 3;
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
  var step = 'fetch';
  console.log(`running job ${name}`);
  return check.fetch().catch(e => {
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
          step = 'action';
          return check.action(result)
            .catch(e => {
              if (e == 'retry') {
                console.log('retrying...');
                return delay(1500).then(() => check.action(result));
              } else {
                return Promise.reject(e);
              }
            })
            .then(result => {
              if (_.isString(_.get(result, 'message'))) {
                notify.notify(result.message);
              }

              return Promise.resolve();
            })
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
      notify.notify(`task completed: ${name}`);
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
  var focused = _.pickBy(checks, (check, name) => _.get(check, 'runThisOnly'));
  //  console.log("11111", focused);
  if (_.size(focused) > 0) {
    var focus = _.toPairs(focused)[0][1];
    var name = _.toPairs(focused)[0][0];
    //    console.log("22222", focus);
    //    console.log(`only running "${name}" monitor`);
    checks = focused;
    job(name, focus);
  } else if (agenda) {
    // prod behaviour

    agenda.start()
      .then(() => {
        var goodChecks = _.pickBy(checks, 'enabled');
        return Promise.all(_.map(goodChecks, (check, name) => {
          console.log('defining check ', name);
          agenda.cancel({ name })
            .then(() => {
              agenda.define(name, () => job(name, check));

              if (_.get(check, 'startTime')) {
                var date = check.startTime;
                console.log('job start at', date);
                return agenda.schedule(date, name);
              } else {
                return agenda.every(check.interval, name);
              }
            }).catch(err => {
              console.log('agenda cancel fails ', err);
            });
        }));
      });
  } else {
    console.log('no mongo url, so cannot start monitor schedule');
  }

}


module.exports = {
  startSchedule
}