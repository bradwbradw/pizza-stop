var _ = require('lodash');

var web3 = require('../module/web3-client.js');
const chains = require('../module/chains.js');

var typeReadMethodList = {
  //'syrup':'stakedToken rewardToken userInfo pendingReward'.split(' '),
  'masterchef':'emergencyWithdraw withdraw deposit poolInfo userInfo(uint256,address)',
  'beets-masterchef':'poolInfo userInfo(uint256,address) deposit(uint256,uint256,address) rewarder lpTokens',
  'syrup':'rewardToken userInfo pendingReward userInfo(address)',
  'beefyVault':'balance decimals deposit want strategy totalSupply withdraw withdrawAll',
  'weighted-pool':'getPoolId getRate getVault nonces onSwap',
  'erc20':'approve totalSupply allowance balanceOf decimals transfer symbol'
};

async function classify({chainID, contractAddress}){
  console.log(`classify ${chainID} ${contractAddress}`)
  var readMethods = await web3.getContractReadMethods(chainID, contractAddress);
  console.log(readMethods);
  var type;
  _.each(typeReadMethodList, (l,typeStr) => {
    var list = l.split(' ');
    if (!_.isString(type)){
      console.log(`is ${chainID} ${contractAddress} a ${typeStr} contract?`);
      var missingRequiredMethod = _.find(list, methodName => {
        return !_.includes(readMethods, methodName);
      });
      if (_.isString(missingRequiredMethod)){
        console.log(`no, it does not have ${missingRequiredMethod}`);
      } else {
        console.log('yes');
        type = typeStr;
      }
    }
  });
  return Promise.resolve(type);
}

module.exports = classify;
