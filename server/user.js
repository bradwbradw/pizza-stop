const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const moment = require('moment');
const ccxt = require ('@mareksokol/ccxt');

module.exports = ({apiKey}) => {

  if (apiKey == process.env.SECRET){
    return Promise.resolve(user());
  } else {
    return Promise.reject({message:"key mismatch"});
  }

}
console.log("brad kraken read:"+process.env.BRAD_KRAKEN_READ);
console.log("brad kraken secret:"+process.env.BRAD_KRAKEN_SECRET);
function user(){
  var exchanges = {
    kraken: new ccxt.kraken({
      apiKey: process.env.BRAD_KRAKEN_READ,
      secret: process.env.BRAD_KRAKEN_SECRET,
      enableRateLimit:true
    }),
    binance: new ccxt.binance({
      apiKey: process.env.BRAD_BINANCE_READ,
      secret: process.env.BRAD_BINANCE_SECRET,
      enableRateLimit:true
    })
  }
  return _.extend({},{
    history:{
      get: ({exchangeArray,pairArray}) => {
        var errors = [];
        return Promise.all(_.map(pairArray, pair =>{
          return getPairHistory(pair)
          .then(result => {
            return _.set({}, pair, result);
          })
          .catch(err => {
            return Promise.resolve(_.set({}, pair, {error:err.message, orders:[]}));
          });
        }))
        .then(objArray => {
          var result = {};
          _.each(objArray, o =>{
            _.extend(result, o);
          });
          return result;

        });

        function getPairHistory(pair){
          return new Promise((resolve, reject) => {
            debugger;
            var ps = _.map(exchangeArray, e => {
              if(_.get(exchanges, e)){

                return exchanges[e].fetchMyTrades(pair);
              } else {
                console.error(`getPairHistory failed for exchange ${e}`);
                return Promise.resolve([]);
              }
            })
            Promise.all(ps)
            .then(([kraken, binance]) => {
              //console.log(kraken, binance);
              return _.flatten([kraken, binance])
            })
            .then(cleanTrades)
            .then()
            .then(resolve)
            .catch(reject)
          });
        }

      }
    },
    exchangeKeys:{
      kraken:{
        apiKey: process.env.BRAD_KRAKEN_READ,
        secret: process.env.BRAD_KRAKEN_SECRET
      },
      binance:{
        apiKey: process.env.BRAD_BINANCE_READ,
        secret: process.env.BRAD_BINANCE_SECRET
      }
    }
  });
}
