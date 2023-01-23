
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
          return web3.callContractMethod({
            contractAddress,
            chainID,
            methodName:'getPoolId',
          })
          .then(poolId => {
            return web3.callContractMethod({
              contractAddress,
              chainID,
              methodName:'getVault',
            })
            .then(vault => {
                return web3.callContractMethod({
                  contractAddress:vault,
                  chainID,
                  methodName:'getPoolTokens',
                  parameters:poolId
                });
            });
          })
          .then(data => {
          //  console.log(JSON.stringify(data,null,2));
            var tok = _.map(_.get(data,'tokens',[]), _.toUpper);
            var bal = _.get(data,'balances',[]);
            var balances = _.zipObject(tok, bal);
            console.log(JSON.stringify(balances, null, 2));
            return Promise.all(_.map(assets, ticker => {
              return Promise.all([
                fns.contract(chainID,ticker),
                web3.decimals(chainID, ticker)
              ])
              .then(([t,decimals]) => {
                return fns.assetBalanceFromString(_.get(balances,_.toUpper(t)), 10**decimals);
              });
            }))
            .then(realBalances => {
              console.log("real balances", realBalances);
              return _.zipObject(assets, realBalances);
            });
      })
        },
      ratio:(address)=>{
        return Promise.all([
          web3.callContractMethod({
            contractAddress,
            chainID,
            address,
            methodName:'totalSupply'
          }),
          web3.callContractMethod({
            contractAddress,
            chainID,
            address,
            methodName:'balanceOf',
            parameters:address
          })
        ]).then(([supply, bal])=>{
          console.log("got supply bal", supply, bal);
            return bal / supply;
          });
        }
    }
  } else {
    console.log("nice is ", fns.nice(o));
    throw new Error(`need an address and chain ID to make weightedPool obj. got contractAddress=${o.contractAddress}. chainID=${o.chainID}. assets=${o.assets}`);
  }

}
