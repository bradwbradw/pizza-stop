var _ = require('lodash');

var cache = require('./cache.js');
var geckoClient = require('./gecko-client.js');

var fns = {
  contract:(chainID,ticker) =>{
      var key = `erc20-address-${chainID}-${ticker}`;
      var cached = cache.checkPersistent(key);
      if (_.isString(cached)){
        return Promise.resolve(cached);
      } else {
        return geckoClient.tickerContract(chainID,ticker)
        .then(contract =>{
              return cache.setPersistent(key, contract);
        });
      }
  },
  isAddress:x =>{
    return _.isString(x) && _.size(x) == 42;
  },
  findBalanceInUserInfo:(userInfo => {
    var oneOfThese = [
      _.get(userInfo, 'amount'),
      _.get(userInfo, 'shares')
    ];

    return _.first(_.compact(oneOfThese));
  }),
  assetBalanceFromString: (string,divisor) =>{
    var n;
    try {
      n = parseInt(string);
      return n/divisor;
    } catch (error) {
      return NaN;
    }
  },
  isNumeric:(x)=>{
    var result;
//    console.log('is numeric? '+x);
    if (_.isUndefined(x) || _.isNull(x) || _.isNaN(x)){
      result = false;
    } else {
      var result = _.isNumber(x) || _.isNumber(_.toNumber(x));
    }
  //  console.log(result);
    return result;
  },
  nice:(x)=>{
    return JSON.stringify(x, null, 2);
  },
  scanForPoolIDs:(deposits, targetAddress, matcherFn)=>{
    var poolIDs = [];
    _.each(deposits, deposit =>{
      var r = deposit.input.slice(10);
      var t = _.truncate(r,{length:64, omission:''});
      var p;
      try {
        p = parseInt(t,16);
      } catch (err){
        p = "?";
      }
      poolIDs = _.union(poolIDs, [p]);
    });
    if (_.isEmpty(poolIDs)){
      poolIDs = [0];
    }

    var correctPoolID;
    var pr = Promise.resolve();

    _.each(poolIDs, pID =>{
      pr = pr.then(()=>{
        console.log(`checking pool id ${pID}`);
        if (_.isNumber(correctPoolID)) {
          return Promise.resolve(correctPoolID);
        } else {
          return matcherFn(pID)
            .then(info => {
//              console.log(fns.nice(info));
              var lpContract;
              if (_.isObject(info)){
                lpContract = _.find(_.values(info), str =>{
                  return fns.isAddress(str);
                });
              } else if (fns.isAddress(info)){
                lpContract = info;
              }
              return lpContract;
            }).then(lpContract => {
              if (_.toUpper(lpContract) == _.toUpper(targetAddress)){
                correctPoolID = pID;
                return correctPoolID;
              } else {
                return Promise.reject('could not find pool id that resolves to a token with address '+targetAddress)
              }
            });
        }
      })
    });
    return pr;

  }
};

module.exports = fns;
