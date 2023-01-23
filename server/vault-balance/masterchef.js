

var _ = require('lodash');

var PS = require('../bundle.js');

var web3 = PS.web3;
var fns = PS.fns;
var geckoClient = PS.geckoClient;
var transactionHistory = PS.transactionHistory;
var lpToken = require('./lp-token.js');

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


  function getPoolIdThenUserInfo(o, tokenAddress){
      return transactionHistory.depositsToContract({
        chainID,
        contractAddress,
        address:o.address
      })
        .then(deposits => {
          return fns.scanForPoolIDs(
            deposits,
            tokenAddress,
            (pID) => {
              return web3.callContractMethod(_.extend(o, {
                methodName:'poolInfo',
                parameters:pID
              }));
            }
          )
        })
        .then(id =>{
          console.log("found pool id", id);
          return web3.callContractMethod(_.extend(o,{
            methodName:'userInfo',
            parameters:`${id} ${o.address}`
          }));
        })
  }
  if (contractAddress && chainID && _.isArray(assets) && !_.isEmpty(assets)){

    if(_.size(assets) == 1){
      return {
        balance:() => {
          var decimals;
          return fns.contract(chainID, _.first(assets))
            .then(c => {
              return web3.decimals(chainID, _.first(assets))
                .then((d)=>{
                  decimals = d;
                  return c;
                })
            })
            .then(c => getPoolIdThenUserInfo(o,c))
            .then(userInfo => {
              return _.set({},_.first(assets),fns.findBalanceInUserInfo(userInfo)/(10**decimals));
            })
        },
        ratio:() => 1
      }
    } else {

      return {
        balance:(lpTokenAddress, assets)=>{
          try {
            var lp = new lpToken({
              contractAddress:lpTokenAddress,
              chainID,
              assets
            });
            return lp.balance(assets);
          } catch(err){
            return Promise.reject(err);
          }
        },
        ratio:(lpTokenAddress, address)=>{
          return getPoolIdThenUserInfo(o,lpTokenAddress)
              .then(userInfo => {
                var amount = fns.findBalanceInUserInfo(userInfo);
                if (fns.isNumeric(amount)){
                  return web3.callContractMethod({
                    contractAddress: lpTokenAddress,
                    chainID,
                    methodName:'totalSupply'
                  }).then(s =>{
                    return amount/s;
                  })
                } else {
                  return Promise.resolve("could not find lp balance");
                }
              });
        }
      };
    }
  } else {
    console.log("nice is ", fns.nice(o));
    throw new Error(`need an address and chain ID to make weightedPool obj. got contractAddress=${o.contractAddress}. chainID=${o.chainID}. assets=${o.assets}`);
  }

}
