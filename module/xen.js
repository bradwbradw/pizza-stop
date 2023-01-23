
const web3 = require('./web3-client.js');
const chains = require('./chains.js');
const _ = require('lodash');
const moment = require('moment');

const HDWalletProvider = require('@truffle/hdwallet-provider');
const balance = require('../server/balance.js');

var xen = {
  "1": "0x06450dEe7FD2Fb8E39061434BAbCFC05599a6Fb8",
  "137": "0x2AB0e9e4eE70FFf1fB9D67031E44F6410170d00e",
  "43114": "0xC0C5AA69Dbe4d6DDdfBc89c0957686ec60F24389",
  "1284": "0xb564A5767A00Ee9075cAC561c427643286F8F4E1",
  "9001": "0x2AB0e9e4eE70FFf1fB9D67031E44F6410170d00e",
  "250": "0xeF4B763385838FfFc708000f884026B8c0434275",
};

var gasPriceOverride = {
  "1": null,
  "137": null,
  "43114": "25000000000",
  "1284": "100000000000",
  "250": "137000000000",
  "9001": null
};

//seedWallets("43114", [1,2,3,4,5,6,7, 8, 9], 0.1);//.then(() => {

function harvestXen(chainID, addressArr) {

  var p = web3.getContract(chainID, xen[chainID]);

  addressArr.map(addressIndex => {
    p = p.then(() => {
      //console.log(`${chainID} claimMintRewardAndShare ${addressIndex}...`);
      return web3.send({
        chainID,
        contractAddress: xen[chainID],
        mnemonic: process.env.BOT_MNEMONIC,
        addressIndex,
        methodName: 'claimMintRewardAndShare',
        parameters: `${process.env.BRAD_T} 100`,
        gasPrice: gasPriceOverride[chainID] ? gasPriceOverride[chainID] : null
      });
    });/*.catch((e) => { 
      console.log(e.message); 
      return Promise.resolve(); 
    }).then(() => {
      console.log(`${chainID} claimMintRewardAndShare ${addressIndex} done`);
      return new Promise((resolve, reject) => {
        setTimeout(resolve, 3000);
      });
    })*/
  });
  return p;
  // return p.then(() => {
  //  console.log(chainID + ": all xen harvested!");
  //})
}

function claimRanks(chainID, addressArr, numDays) {
  var p = web3.getContract(chainID, xen[chainID]);
  addressArr.map(addressIndex => {
    p = p.then(() => {
      //      console.log(`${chainID} claimRanks ${addressIndex}...`);
      return web3.send({
        chainID,
        contractAddress: xen[chainID],
        mnemonic: process.env.BOT_MNEMONIC,
        addressIndex,
        methodName: 'claimRank',
        parameters: `${numDays}`,
        gasPrice: gasPriceOverride[chainID] ? gasPriceOverride[chainID] : null
      });
    });/*.catch((e) => { 
      console.log(e.message); 
      return Promise.resolve(); })
      .then(() => {
      return new Promise((resolve, reject) => {

        console.log(`${chainID} claimRanks ${addressIndex} complete`);
        setTimeout(resolve, 3000);
      });
    });*/
  });

  return p;

  /*.then(() => {
    console.log('all claimRanks done for ' + chainID);
  });
  */
}


function xenCheck(addressIndeces, chainIDs) {
  var addys = web3.botAddresses(addressIndeces);
  var p = Promise.resolve();
  _.each(chainIDs, chainID => {
    var i = 0;
    _.each(addys, address => {

      var addressIndex = addressIndeces[i++];
      //      console.log(`${addressIndex}: ${address}`);
      p = p.then((found) => {
        if (_.isObject(found)) {
          return found;
        } else {
          return balance.get({ chainID, address })
            .then((result) => {
              if (result.balance[result.nativeCurrency] == 0) {
                return false;
              } else return web3.callContractMethod({
                chainID,
                contractAddress: xen[chainID],
                methodName: 'userMints',
                parameters: address,
                returnIndeces: 'maturityTs'
              }).then(m => {
                var n = parseInt(m.maturityTs);
                var mom = moment.unix(n).utc();
                var d = moment().utc().diff(mom, 'seconds');
                //console.log('maturity', n);
                //console.log('diff', d);
                if (d > 0 || m.maturityTs === '0') { // 
                  return { chainID, address, addressIndex, maturity: m.maturityTs };
                } else {
                  return false;
                }
              }).catch(err => {
                console.error(err);
                return Promise.resolve(false);
              })
            })
        }

      })
    });
  });
  return p.then(maybe => {
    if (_.isObject(maybe)) {
      var msg = `at ${maybe.chainID} ${maybe.addressIndex}: ${maybe.address}`;
      return _.extend(maybe, {
        message: maybe.maturity == '0' ? `need to claim rank for ${msg}` : `found xen to mint ${msg}`
      })
    } else {
      return {
        message: 'no xen available to mint'
      }
    }
  });


}

module.exports = {
  claimRanks,
  harvestXen,
  xenCheck
}