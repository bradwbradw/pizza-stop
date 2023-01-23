var web3 = require('../module/web3-client.js');
var scan = require('../module/scan-client.js');
var fns = require('../module/fns.js');
var chains = require('../module/chains.js');
var geckoClient = require('../module/gecko-client.js');
var cache = require('../module/cache.js');
var transactionHistory = require('../module/transaction-history.js');
var queue = require('../module/queue.js');
var classify = require('./contract-classify.js');

var _ = require('lodash');

var divisor = 1000000000000000000;

function vaultCacheKey(o){
  return `${o.address}-${o.contractAddress}-${_.get(o,'lpTokenContract','')}`;
}

function lpAssetBalances({
  assets,
  chainID,
  lpTokenAddress,
  lpTokenAmount
}){

  console.log("lpTokenAmount is "+lpTokenAmount);
  var amountN = 0;
  if (_.isString(lpTokenAmount)){
    amountN = fns.assetBalanceFromString(lpTokenAmount, divisor);
  } else if (_.isNumber(lpTokenAmount)){
    amountN = lpTokenAmount/divisor;
  } else {
    return Promise.reject(`could not find lp balance. got amount ${lpTokenAmount}`);
  }

  return scan.client(chainID).tokenSupply(lpTokenAddress)
  .then(r => {
    var lpTokenSupply = fns.assetBalanceFromString(r,divisor);
    console.log('token supply is ',lpTokenSupply);
    if (!_.isNumber(lpTokenSupply) || lpTokenSupply == 0){
      return Promise.reject("token supply is 0");
    }
    var ratio = amountN / lpTokenSupply;
    console.log('ratio ',ratio);


    return p.then(()=>{
      return data;
    })
  });

}

function syrupBalance(o){
  var methodName;
  if (web3.contractHasMethod(o,'syrup')){
    methodName = 'syrup';
  } else if (web3.contractHasMethod(o, 'stakedToken')){
    methodName = 'stakedToken';
  } else {
    return Promise.reject('unknown kind of syrup contract');
  }
  return web3.callContractMethod(_.extend(o,{
    methodName
  })).then(tokenAddress =>{
    return Promise.all([
      web3.callContractMethod(_.extend(o,{
        methodName:'userInfo',
        parameters:o.address
      })),
      web3.decimals(o.chainID,tokenAddress)
    ]);
  })
  .then(([info,decimals]) => {
    var balance = _.get(info,'amount');
    if (_.isString(balance) || _.isNumber(balance)) {
      return balance / 10**decimals
    } else {
      return Promise.reject("syrup contract userInfo or decimals failed");
    }
  }).then(realBalance => {
    return _.extend(o,_.set({},_.first(o.assets),realBalance));
  });
}
function beefyBalance(params){
  // BEEFY
  // get share balance
  var shareBalance;
  var pricePerShare;
  var stakedAssetContract;
  var lpTokenBalanceString;
  var lpTokenSupply;
  var lpTokenDecimals;
  var ratio;
  return web3.tokenBalance(params)
    .then(b => {
      shareBalance = b;
      return web3.callContractMethod(_.extend(params, {methodName:"getPricePerFullShare"}))
        .then(p =>{
          pricePerShare = p;
          lpTokenBalanceString = pricePerShare * shareBalance;

          return web3.callContractMethod(_.extend(params, {methodName:"want"}))
            .then(s => {
              stakedAssetContract = s;
              return web3.callContractMethod({
                chainID:params.chainID,
                contractAddress: stakedAssetContract,
                methodName:'totalSupply'
              }).then(s =>{
                lpTokenSupply = s;
                return web3.decimals(params.chainID,stakedAssetContract)
              });
            })
            .then((d) => {
              lpTokenDecimals = d;
              ratio = lpTokenBalanceString / lpTokenSupply;
              console.log(`beefy vault ratio ${ratio}`);
              var assets = params.assets;
              if (_.size(assets) == 1){
                var ticker = _.first(assets);
                return web3.decimals(params.chainID,ticker)
                  .then(decimals => {
                    console.log(`yep ${decimals} decimals`);
                    _.set(params, ticker, lpTokenBalanceString / (10**decimals))
                    return params;
                  })
              } else {
                return classify({
                  chainID:params.chainID,
                  contractAddress:stakedAssetContract
                }).then(type =>{
                  var pId;
                  var vault;
                  var contract;
                  if (type == 'weighted-pool'){
                    contract = (new require('./vault-balance/weighted-pool.js'))({
                      contractAddress:stakedAssetContract,
                      chainID:params.chainID,
                      assets
                    });
                  }
                  else if (type == 'erc20'){
                    contract = (new require('./vault-balance/lp-token.js'))({
                      contractAddress:stakedAssetContract,
                      chainID:params.chainID,
                      assets
                    });
                  }

                  return contract.balance()
                    .then(balances => {
                      return applyRatio(balances, ratio);
                    });
                  });
              }
            })

        })
      });
}

function weightedPoolBalances({contractAddress, chainID, assets}){
}
function applyRatio(balances, ratio){
    _.each(balances, (v, ticker) => {
      _.set(balances, ticker, v*ratio);
    });
    return balances;
}

var balanceFunctions = {
  'masterchef': (o) => {
    var contract = (new require(`./vault-balance/masterchef.js`))(o);
    return Promise.all([
        contract.balance(o.lpTokenContract, o.assets),
        contract.ratio(o.lpTokenContract, o.address)
      ])
      .then(([balances,ratio]) =>{
        console.log('ratio ',ratio);
        return applyRatio(balances,ratio);
      });
  },
  'beets-masterchef': o => {

      var contract = (new require(`./vault-balance/beets-masterchef.js`))(o);
      return Promise.all([
          contract.balance(o.lpTokenContract, o.assets),
          contract.ratio(o.lpTokenContract, o.address)
        ])
        .then(([balances,ratio]) =>{
          console.log('ratio ',ratio);
          return applyRatio(balances,ratio);
        });
  },
  syrup:syrupBalance,
  'beefyVault':beefyBalance,
  'weighted-pool': (o) => {
    var contract = (new require(`./vault-balance/weighted-pool.js`))(o);
    return Promise.all([
        contract.balance(),
        contract.ratio(o.address)
      ])
      .then(([balances,ratio]) =>{
        console.log('ratio ',ratio);
        return applyRatio(balances,ratio);
      });
  }
};

function get(params) {
  //TODO assess type of vault: masterchef / beefy / etc...

    params.assets = _.toLower(params.assets).split(' ');
    var p;
    if (_.isEmpty(params.lpTokenContract) && _.size(params.assets) ==  1){
      // safe to assume we can use asset erc20 contract as lp contract
      p = geckoClient.tickerContract(params.chainID, _.first(params.assets))
          .then(c => {
            console.log("extending with ",c);
            return _.extend(params,
              {
                lpTokenContract:c
              });
          });
    } else {
      p = Promise.resolve();
    }
      return p.then(()=>{
        console.log(params);
        return queue.queuedTask(()=>{

          var key = vaultCacheKey(params);
          var cached = cache.check(key);
          if (_.isObject(cached)){
            console.log("vault cache hit",cached);
            p = p.then(() => Promise.resolve(cached));
          } else {

            var fn;
            p = p.then(() => classify(params))
              .then(type => {
                  console.log('classifier returned '+type);
                  if (_.isFunction((_.get(balanceFunctions, type)))){
                    fn = balanceFunctions[type];
                    return fn(params).then((result)=>{
                      return cache.set(key, result);
                    });
                  } else {
                    return Promise.reject(`cannot classify ${params.chainID} ${params.contractAddress}`);
                  }
              });
          }
          return p.then(result =>{
            if (_.get(params, 'targetAsset')){
              var targetBalance = _.get(result, _.toLower(params.targetAsset));
              return _.merge({},result, {balance:targetBalance})
            } else {
              return result;
            }
          });
        },
        'contract-balance-'+params.chainID,
        500);
      });
}

module.exports = {
  get
};
