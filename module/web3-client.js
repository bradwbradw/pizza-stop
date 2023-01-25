
var Web3 = require('web3');
var _ = require('lodash');
var superagent = require('superagent');

const { setupLoader } = require('@openzeppelin/contract-loader');
const HDWalletProvider = require('@truffle/hdwallet-provider');

var scan = require('./scan-client.js');
var chains = require('./chains.js');
var cache = require('./cache.js');
var fns = require('./fns.js');
const { chain } = require('lodash');
const notify = require('../server/notify.js');

const { GasPriceOracle } = require('gas-price-oracle');

var utils = Web3.utils;

var timeout = 30000;
var chainMap = {};

function get(chainID) {
  var wsUrl = _.get(chains, `${chainID}.ws`);
  var httpUrl = _.get(chains, `${chainID}.http`);

  const options = {
    clientConfig: {
      keepalive: true,
      keepaliveInterval: 30000
    },
    // Enable auto reconnection
    reconnect: {
      auto: true,
      delay: 5000, // ms
      maxAttempts: 5,
      onTimeout: false
    }
  };

  var api;
  if (_.isObject(chainMap[chainID])) {
    api = chainMap[chainID];
  } else if (httpUrl) {
    //    console.log(`chain ${chainID} RPC is ${httpUrl}`);

    api = new Web3(httpUrl);
    api.setProvider(new Web3.providers.HttpProvider(httpUrl));
    _.set(chainMap, chainID, api);
    //return api;
  } else if (wsUrl) {
    api = new Web3(wsUrl);
    //  console.log(`chain ${chainID} RPC is ${wsUrl}`);
    api.setProvider(new Web3.providers.WebsocketProvider(wsUrl, options));
    _.set(chainMap, chainID, api);
    api.on('close', (e) => {
      console.log(`web3 provider CLOSE. chain ${chainID}: ${e}`);
    });
    api.on('disconnect', () => {
      console.log(`web3 provider DISCONNECT. chain ${chainID}: ${e}`);
    });
    api.on('exit', () => {
      console.log(`web3 provider EXIT. chain ${chainID}`);
    });
    api.on('connection', () => {
      console.log(`web3 provider CONNECTION. chain ${chainID}`);
    })
    api.on('error', (e) => {
      console.log(`web3 provider error chain ${chainID}: ${e}`)
    })
    // return api;
  } else {
    throw new Error("unrecognized chain id " + chainID);
  }

  api.eth.handleRevert = true;
  return api;
}


function getContract(chainID, contractAddress, implementationContractAddress) {
  var localStorageKey;
  if (_.isString(implementationContractAddress)) {
    localStorageKey = `abi-${chainID}-${implementationContractAddress}`;
  } else {
    localStorageKey = `abi-${chainID}-${contractAddress}`;
  }
  //console.log('check for cached abi ', localStorageKey);
  var cachedAbi = cache.checkPersistent(localStorageKey);
  var contract;
  if (_.isObject(cachedAbi)) {
    //console.log('cached ABI found', localStorageKey);
    try {
      contract = new (get(chainID)).eth.Contract(cachedAbi, contractAddress);
    } catch (err) {
      return Promise.reject(err);
    }
    return Promise.resolve(contract);
  } else {
    //console.log('cached ABI not found', localStorageKey);
    //get abi from etherscan et al then return web3 contract from that
    return scan.client(chainID).abi(implementationContractAddress ? implementationContractAddress : contractAddress)
      .then(abiResult => {
        var validABI;
        try {
          validABI = JSON.parse(abiResult);
        } catch (error) {
          return Promise.reject("could not parse abi from *scan REST api: " + abiResult);
        }

        try {
          contract = new (get(chainID)).eth.Contract(validABI, contractAddress);
        } catch (err) {
          return Promise.reject(err);
        }
        if (implementationContractAddress) {
          return contract;
        } else {
          return checkForProxy(chainID, contract)
            .then(implementation => {
              if (_.isString(implementation)) {
                //                console.log(`implementation for ${contractAddress} is ${implementation}`);
                return getContract(chainID, contractAddress, implementation);
              } else if (implementation) {
                console.log('implementation is not string?', implementation);
                return Promise.reject('bad implementation address found');
              } else {
                cache.setPersistent(localStorageKey, abiResult);
                return contract;
              }
            });
        }
      })
  }
}

function checkForProxy(chainID, contract) {
  //CHECK FOR PROXY
  var yes = _.isFunction(_.get(contract, 'methods.implementation')) &&
    _.isFunction(_.get(contract, 'methods.upgradeTo')) &&
    _.isFunction(_.get(contract, 'methods.admin'));
  //  console.log('contract', contract);
  // process.exit(1)
  //  console.log(`is proxy: ${chainID}-${contract._address}? ${yes ? 'yes' : 'no'}`);
  //TASK view memory location to get implementation address
  //console.log(contract);
  if (yes) {

    var magicStorageSlotForImplementation = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
    // ^^ (obtained as bytes32(uint256(keccak256('eip1967.proxy.implementation')) - 1)).
    // https://eips.ethereum.org/EIPS/eip-1967

    return (get(chainID)).eth.getStorageAt(contract._address, magicStorageSlotForImplementation)
      .then(val => {
        //        console.log('val', val);
        if (_.isString(val) && _.includes(val, '0x00000')) {
          var removePadding = _.last(_.split(val, 'x'));
          var addy = _.trimStart(removePadding, '0');
          //          console.log('got addy', addy);
          return `0x${utils.padLeft(addy, 40)}`;
        } else {
          return Promise.reject('unexpected value from implementatino storage slot', val);
        }

      }).catch(err => {
        console.log('cannot read storage to find implementation');
        return Promise.resolve(null);
      })
  } else {
    return Promise.resolve(null);
  }
}

function getAbiSync(chainID, contractAddress, method) {

  var cached = cache.checkPersistent(`abi-${chainID}-${contractAddress}`);
  if (_.isObject(cached)) {
    return cached;
  } else if (_.isObject(_.get(customABIs, method))) {
    //console.log(customABIs[method]);
    return customABIs[method];
  } else {
    throw new Error(`cannot get abi synchronously for ${chainID} ${contractAddress}`);
  }
}

function getContractReadMethods(chainID, contractAddress) {
  return getContract(chainID, contractAddress)
    .then(contract => {
      return _.filter(_.keys(_.get(contract, 'methods', {})), s => {
        return !_.startsWith(s, '0x');
      });
    });
}
function contractHasMethod({ chainID, contractAddress }, methodName) {
  var web3 = get(chainID);
  var contract = new web3.eth.Contract(getAbiSync(chainID, contractAddress), contractAddress);
  return _.isFunction(_.get(contract, `methods.${methodName}`));
}

function botAddresses(arr) {
  var provider;
  var m = _.max(arr) + 1;
  try {
    provider = new HDWalletProvider({
      mnemonic: process.env.BOT_MNEMONIC,
      providerOrUrl: _.get(chains, `1.http`),
      numberOfAddresses: m,//.length,
      //      addressIndex: i,
      shareNonce: false
    });
  } catch (err) {
    console.log('there was an error', err);
    return [];
  }
  var out = [];
  _.each(arr, n => {
    provider.addressIndex = n;
    out = _.concat(out, [provider.getAddress(n)]);
  })
  provider.engine.stop();// = null;
  //console.log('out', out);
  return out;//provider.getAddress();
}

function callContractMethod({ chainID, contractAddress, address, addressIndex, methodName, parameters, returnIndeces }) {

  if (!chainID) {
    return Promise.reject("no chainID");
  }
  var makeCall = contract => {
    if (!_.isEmpty(methodName) && _.isFunction(_.get(contract, `methods.${methodName}`))) {

      var p;
      var log;
      if ((parameters || parameters == 0) && !_.isEmpty(parameters)) {
        var arr = ('' + parameters).split(' ');
        log = `${chainID} ${contractAddress}.${methodName}(${arr})`;
        p = contract.methods[methodName].apply(this, arr).call({ from: address });//)//({from:address})
      } else {
        log = `${chainID} ${contractAddress}.${methodName}()`;
        p = contract.methods[methodName]().call()
      }
      return p.then(result => {
        //        console.log(`${log} -> `, JSON.stringify(result, null, 2));
        if (returnIndeces) {
          var data = {};
          _.each(returnIndeces.split(' '), i => {
            _.set(data, i, _.get(result, i));
          });
          return data;
        } else {
          return result;
        }
      }).catch(err => {

        console.log(`${log} err:`, err);
      });
    } else {

      return Promise.reject(`no method ${methodName} in contract ${contractAddress} on chain ${chainID}`);
    }
  };

  return getContract(chainID, contractAddress)
    .then(makeCall)
    .catch(err => {

      console.log('getContract error:', err);
      var abi = _.get(customABIs, methodName);
      if (!_.isEmpty(abi)) {
        console.log(`using custom ABI for ${_.get(_.first(abi), 'type')} ${methodName}`);
        var contract;

        try {
          contract = new (get(chainID)).eth.Contract(abi, contractAddress);
        } catch (errr) {
          console.error(errr);
        }
        if (contract) {

          //process.exit(1);
          console.log('making the call...');
          return makeCall(contract);
        } else {
          return Promise.reject('cannot make contract with custom abi');
        }
      } else {
        notify.notify(`no method ${methodName}, missing custom abi for contract ${contractAddress} on chain ${chainID}`);
        return Promise.reject(err);
      }

    });
}

var gasOracles = {};

function estimateGasWei(chainID, speed) {
  if (!_.isString(speed)) {
    speed = 'low';
  }
  var oracle;
  if (_.get(gasOracles, chainID)) {
    oracle = gasOracles[chainID];
  } else {
    gasOracles[chainID] = new GasPriceOracle({ chainId: parseInt(chainID) });
    oracle = gasOracles[chainID];
  }
  return oracle.gasPrices()
    .then(prices => {
      var price = prices[speed];//700 for moonbeam
      var gasPrice = _.round(price * (10 ** 9));
      if (!_.isNaN(gasPrice) && _.isNumber(gasPrice)) {
        console.log(`${chainID} ${speed} gas price is ${price} gWei = ${gasPrice} wei`);
        return `${gasPrice}`;
      } else {
        console.error('no price found in prices', prices);
        return Promise.reject({ message: 'could not estimate gas price' });
      }
    });

}

function sendNativeTokens({ chainID, from, to, mnemonic, number }) {
  var value = utils.toWei(`${number}`, 'ether');
  console.log('send ' + (`${value}`, 'wei'));
  return Promise.all([
    estimateGasWei(chainID, 'low'),
    get(chainID).eth.estimateGas({
      to,
      from,
      value,
    })])
    .then(([gasPrice, gas]) => {

      return send({
        chainID,
        mnemonic,
        tx: {
          from,
          gasPrice: "25000000000",// "50" + "000000000", 25000000000
          gas,//: "50000",
          to,
          value: _.round(number * (10 ** 18)).toString(),// "1000000000000000000",
          data: ""
        }
      });
    })
}

function send({ chainID, contractAddress, mnemonic, addressIndex, methodName, parameters, tx, gasLimit, gasPrice }) {
  //console.log('chains', chains);
  var rpc = _.get(chains, `${chainID}.http`);
  if (!_.isInteger(addressIndex)) {
    addressIndex = 0;
  }

  if (mnemonic && rpc) {
    const provider = new HDWalletProvider({
      mnemonic,
      providerOrUrl: rpc,
      addressIndex
    });
    const web3 = new Web3(provider);
    var log = "[UNDEFINED TX LOG]", p;
    if (methodName) {
      const loader = setupLoader({ provider: web3 }).web3;
      var abi = getAbiSync(chainID, contractAddress, methodName);
      if (!abi) {
        //abi = _.get(customABIs, methodName);
        console.log('missing custom abi for ' + methodName);
        return Promise.reject("no abi for contract " + contractAddress);
      }
      const contract = loader.fromABI(abi, null, contractAddress);

      if (_.isFunction(_.get(contract.methods, methodName))) {

        if (parameters || parameters == 0) {
          var arr = ('' + parameters).split(' ');
          log = `${chainID} ${provider.getAddress()} calls ${contractAddress}.${methodName}(${arr})`;
          // TODO potential gas sink if it's not verified at all ??
          var contractCall = contract.methods[methodName].apply(this, arr);
          p = Promise.all([
            gasLimit ? Promise.resolve(gasLimit) : contractCall.estimateGas({ from: provider.getAddress() }),
            gasPrice ? Promise.resolve(gasPrice) : estimateGasWei(chainID, 'low')
          ])
            .then(([gas, gasPrice]) => {
              console.log("method " + methodName + " gas is ", gas + " so trying with " + (gas));
              return contractCall.send({
                from: provider.getAddress(),
                gas: gas,
                gasPrice: gasPrice
              });
            })

        } else {
          log = `${chainID} ${contractAddress}.${methodName}()`;
          p = contract.methods[methodName]().send()
        }
      } else {
        provider.engine.stop();
        return Promise.reject("no method found: " + methodName);
      }
    } else if (_.isObject(tx)) {

      var logTx = {};
      _.each(tx, (v, k) => {
        var r = parseInt(v);
        logTx[k] = r;
      });


      log = `sending tx as base ten: \n` + JSON.stringify(logTx, null, 2);

      //p = Promise.reject('bleh')
      p = sendAttempt(web3, tx, 1)

    } else {
      p = web3.eth.personal.send
    }
    console.log(log + "...");
    return p;
  } else {
    return Promise.reject(`no mnemonic, or bad rpc (${rpc}) from chainID ${chainID}`);
  }

}

function sendAttempt(web3, tx, attempt, lastError) {

  if (attempt >= 2) {
    return Promise.reject("too many attempts", lastError);
  }

  console.log("modifying tx.gasPrice. Before:", tx.gasPrice);
  //tx.gas = gasLimit;
  tx.gasPrice = _.round(tx.gasPrice * attempt);//"26000000000"

  //tx.gas = web3.utils.toHex(tx.gas);
  //tx.gasPrice = web3.utils.toHex(tx.gasPrice);
  console.log("after: ", tx.gasPrice);
  console.log(`sending transaction costing ${tx.gas} gas units, at ${tx.gasPrice} gwei per unit. attempt ${attempt}...`);
  return web3.eth.signTransaction(tx)
    .then(signed => {

      console.log('sending tx', tx);
      return new Promise((resolve, reject) => {
        var emitter = web3.eth.sendSignedTransaction(signed.raw)
          .once('sending', function (payload) {
            console.log(`sending... (attempt ${attempt})`);
          })
          .once('sent', function (payload) {
            console.log(`sent (attempt ${attempt})`);
          })
          .once('transactionHash', function (hash) {
            console.log(`transaction hash ${hash} (attempt ${attempt})`);
          })
          /*.once('receipt', function (receipt) {
            console.log('receipt ', receipt);
            console.log(`^(attempt ${attempt})`);
          })*/
          .on('confirmation', function (confNumber, receipt, latestBlockHash) {
            console.log(`confirmation ${confNumber} (attempt ${attempt})`);

            //console.log('emitter 22222', emitter);
            emitter.removeAllListeners();
            resolve(receipt);

          })
          .on('error', function (error) {
            emitter.removeAllListeners();
            setTimeout(() => {
              reject(error);
            }, 4000)
          });

        //console.log('emitter 11111', emitter);


      })
    })
    .catch(err => {
      console.error("transaction failed, attempt " + attempt, err);
      attempt++;
      return sendAttempt(web3, tx, attempt, err);
    })
}

function tokenBalance({ chainID, address, contractAddress }) {
  if (_.isString(address) && chainID && !_.isEmpty(address)) {

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(`web3 ${chainID} ${address} ${contractAddress} fail:  ${timeout} ms timeout`);
      }, timeout);
      tokenBalanceWork({ chainID, address, contractAddress })
        .then(resolve)
        .catch(reject);
    });
  } else {
    return Promise.reject("tokenBalance got incorrect params: " + JSON.stringify({ chainID, address, contractAddress }, null, 2));
  }
}

function decimals(chainID, tickerOrAddress) {
  var p;
  if (fns.isAddress(tickerOrAddress)) {
    p = Promise.resolve(tickerOrAddress);
  } else {
    p = fns.contract(chainID, tickerOrAddress)
  }

  return p.then(address => {
    if (!fns.isAddress(address)) {
      return Promise.reject(`unable to get address for ${chainID} ${ticker}`);
    } else {
      var key = `decimals-${chainID}-${address}`;
      var cached = cache.checkPersistent(key);
      if (fns.isNumeric(cached)) {
        return Promise.resolve(_.toNumber(cached));
      } else {
        return callContractMethod({
          chainID,
          contractAddress: address,
          methodName: "decimals"
        })
          .then(decimals => {
            if (fns.isNumeric(decimals)) {
              return cache.setPersistent(key, decimals);
            } else {
              return Promise.reject(`unable to get decimals for ${chainID} ${ticker}`);
            }
          });
      }
    }
  });

}

function tokenBalanceWork({ chainID, address, contractAddress }) {
  if (contractAddress) {
    // for ERC20 tokens
    return decimals(chainID, contractAddress)
      .then(decimals => {
        console.log(`${contractAddress} token is ${decimals} decimals`);
        return callContractMethod({
          chainID,
          contractAddress,
          methodName: "balanceOf",
          parameters: address
        })
          .then(balance => {
            var n = balance / (10 ** decimals);
            if (_.isNumber(n) && !_.isNaN(n)) {
              //              console.log(`${address} has ${n} tokens of ${chainID} ${contractAddress}`);
              return n;
            } else {
              return Promise.reject("NaN");
            }
          });
      });
  } else {
    // for native token on a particular chain
    //    console.log(`${chainID} ${address} getting native token balance...`);
    var web3 = get(chainID);
    return web3.eth.getBalance(address)
      .then(b => {
        var n = b / (10 ** 18);
        //        console.log(`${address} has ${n} tokens of ${chainID} native token`);
        return n;
      })
  }

}

function event(chainID, address, event) {

  var options = {

  }
  return new Promise((resolve, reject) => {
    var subscription = get(chainID).subscribe('logs', options, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
        subscription.unsubscribe();
      }
    });
  })
}



var customABIs = {
  decimals: [
    {
      "inputs": [],
      "name": 'decimals',
      "outputs": [
        {
          "name": "decimals",
          "type": "uint256"
        }
      ],
      "type": "function"
    },
  ],
  totalSupply: [
    {
      "inputs": [],
      "name": 'totalSupply',
      "outputs": [
        {
          "name": "totalSupply",
          "type": "uint256"
        }
      ],
      "type": "function"
    },
  ],
  token0: [
    {
      "inputs": [],
      "name": 'token0',
      "outputs": [
        {
          "name": "token0",
          "type": "address"
        }
      ],
      "type": "function"
    },
  ],
  token1: [
    {
      "inputs": [],
      "name": 'token1',
      "outputs": [
        {
          "name": "token1",
          "type": "address"
        }
      ],
      "type": "function"
    },
  ],
  balanceOf: [
    {
      "inputs": [
        {
          "name": "name",
          "type": "address"
        }
      ],
      "name": 'balanceOf',
      "outputs": [
        {
          "name": "name",
          "type": "uint256"
        }
      ],
      "type": "function"
    },
  ],
  userInfo: [
    {
      inputs: [
        {
          name: "pid",
          type: "uint256"
        },
        {
          name: "address",
          type: "address"
        }
      ],
      name: "userInfo",
      outputs: [
        {
          name: "amount",
          type: "uint256"
        }
      ],
      type: "function"
    }
  ],
  claimRank: [
    { "inputs": [{ "internalType": "uint256", "name": "term", "type": "uint256" }], "name": "claimRank", "outputs": [], "stateMutability": "nonpayable", "type": "function" }
  ],
  claimMintRewardAndShare: [
    { "inputs": [{ "internalType": "address", "name": "other", "type": "address" }, { "internalType": "uint256", "name": "pct", "type": "uint256" }], "name": "claimMintRewardAndShare", "outputs": [], "stateMutability": "nonpayable", "type": "function" }
  ],
  userMints: [
    { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "userMints", "outputs": [{ "internalType": "address", "name": "user", "type": "address" }, { "internalType": "uint256", "name": "term", "type": "uint256" }, { "internalType": "uint256", "name": "maturityTs", "type": "uint256" }, { "internalType": "uint256", "name": "rank", "type": "uint256" }, { "internalType": "uint256", "name": "amplifier", "type": "uint256" }, { "internalType": "uint256", "name": "eaaRate", "type": "uint256" }], "stateMutability": "view", "type": "function" }
  ],
  reserve0: [
    {
      "inputs": [],
      "name": "reserve0",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ],
  reserve1: [
    {
      "inputs": [],
      "name": "reserve1",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ],/*
  isBarnClaimedForTokwn: [


    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tokenId",
          "type": "uint256"
        }
      ],
      "name": "isBarnClaimedForToken",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }

  ],*/
  newOne: [


    { paste: "here" }

  ]
};



module.exports = {
  callContractMethod,
  sendNativeTokens,
  send,
  tokenBalance,
  contractHasMethod,
  getContractReadMethods,
  decimals,
  getContract,
  event,
  estimateGasWei,
  botAddresses,
  utils
}