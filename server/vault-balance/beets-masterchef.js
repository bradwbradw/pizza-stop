
var _ = require('lodash');

var PS = require('../bundle.js');
var web3 = PS.web3;
var fns = PS.fns;
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
      balance:(lpTokenAddress, assets)=>{
        var contract = new require('./weighted-pool.js')({
          contractAddress:lpTokenAddress,
          chainID,
          assets
        });
        return contract.balance();
      },
      ratio:(lpTokenAddress, address) => {
        return transactionHistory.depositsToContract({
          contractAddress,
          chainID,
          address
        }).then(deposits => {
          console.log(fns.nice(deposits));
          return fns.scanForPoolIDs(
            deposits,
            lpTokenAddress,
            (pID) => {
              return web3.callContractMethod({
                contractAddress,
                chainID,
                methodName:'lpTokens',
                parameters:pID
              });
            }
          ).then(poolID =>{
            console.log("ppp", poolID);

            return web3.callContractMethod({
              contractAddress,
              chainID,
              methodName:'userInfo',
              parameters:`${poolID} ${address}`
            });
          }).then(info =>{
            var balance = _.get(info, 'amount');
            return web3.callContractMethod({
              contractAddress:lpTokenAddress,
              chainID,
              methodName:'totalSupply'
            }).then(supply =>{
              return balance/supply;
            })
          });
//          return 0.4;
        })
      }
    };
  } else {}
}
