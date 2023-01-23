
var _ = require('lodash');

var PS = require('../bundle.js');
var web3 = PS.web3;
var fns = PS.fns;
var geckoClient = PS.geckoClient;
var transactionHistory = PS.transactionHistory;

module.exports = function(o){
  var contractAddress;
  var chainID;
  var assets;

  if (_.isString(_.get(o,'contractAddress'))){
    contractAddress = o.contractAddress;
  }
  if (o.chainID){
    chainID = ''+o.chainID;
  }
  if (o.assets){
    assets = o.assets;
  }

  if (contractAddress && chainID && _.isArray(assets) && !_.isEmpty(assets)){

    return {
      balance:()=>{

          var p = Promise.resolve();
          var data = {};
          _.each(assets, (ticker) => {
            p = p.then(()=>{
              return geckoClient.asset(ticker, chainID)
              .then(assetData => {
                var tokenAddress = _.get(assetData, `contract`);
                if (_.isString(tokenAddress) && _.size(tokenAddress) > 0){
                  return web3.tokenBalance({
                    chainID,
                    address:contractAddress,
                    contractAddress: tokenAddress
                  }).then(balance =>{
                    _.set(data, ticker, balance);
                  });
                } else {
                  return Promise.reject('could not get contract address for '+ticker);
                }
              });
            });
          });

          return p.then(()=> data);
      }
    }
  } else {

    console.log("nice is ", fns.nice(o));

    throw new Error(`need to specify assets for lp token..? got contractAddress=${o.contractAddress}. chainID=${o.chainID}. assets=${o.assets}`);
  }
}
