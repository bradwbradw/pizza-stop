
var _ = require('lodash');
var superagent = require('superagent');
var moment = require('moment');


var scan = require('./scan-client.js');
var geckoClient = require('./gecko-client.js');
var chains = require('./chains.js');
var web3 = require('./web3-client.js');
var notify = require('../server/notify.js');

// USD stables
function prepare({ spendTicker, srcToken, spendAmount, baseTicker, destToken, chainID }) {

  if (spendAmount == 0) {
    return Promise.resolve(0);
  } else {
    var p1, p2;

    if (_.isString(srcToken)) {
      p1 = Promise.resolve({ contract: srcToken });
    } else {
      p1 = geckoClient.asset(spendTicker, chainID);
    }

    if (_.isString(destToken)) {
      p2 = Promise.resolve({ contract: destToken });
    } else {
      p2 = geckoClient.asset(baseTicker, chainID);
    }

    return Promise.all([p1, p2])
      .then(([asset, base]) => {
        if (!_.isString(_.get(asset, 'contract'))) {
          return Promise.reject("(swap.getPrices) no contract found for " + spendTicker);
        }

        if (!_.isString(_.get(base, 'contract'))) {
          return Promise.reject("(swap.getPrices) no contract found for " + baseTicker);
        }
        var p1, p2;

        if (_.isString(spendTicker) && _.toUpper(spendTicker) == "USDC") {
          p1 = Promise.resolve(6);
        } else {
          p1 = web3.decimals(chainID, asset.contract);
        }

        if (_.isString(baseTicker) && _.toUpper(baseTicker) == "USDC") {
          p2 = Promise.resolve(6);
        } else {
          p2 = web3.decimals(chainID, base.contract);
        }

        return p1
          .then(srcDecimals => {
            return p2
              .then(destDecimals => {
                var a = _.floor(spendAmount * 10 ** srcDecimals);
                return paraswapPrice({
                  srcToken: asset.contract,
                  srcDecimals,
                  destDecimals,
                  destToken: base.contract,
                  amount: a,
                  chainID
                });
              });
          });
      })
      .then(paraswapResult => {
        var amount = _.get(paraswapResult, 'priceRoute.destAmount');
        var decimals = _.get(paraswapResult, 'priceRoute.destDecimals');
        //        console.log('amount', amount);
        //      console.log('decimals', decimals);
        var value = amount / (10 ** decimals);
        console.log('value ', value);
        return {
          value,
          pricesResponse: paraswapResult
        };
      })
      .catch(err => {
        console.log(err);
      })

  }
}

function paraswapPrice({ srcToken, destToken, srcDecimals, destDecimals, amount, chainID }) {
  var params = {
    srcToken,
    destToken,
    srcDecimals,
    destDecimals,
    amount,
    network: chainID
  }
  //  console.log('pswap params', { srcToken, destToken, srcDecimals, destDecimals, amount, chainID });
  return superagent.get('https://apiv5.paraswap.io/prices/')
    .query(params)
    .then(result => {
      return _.get(result, 'body', JSON.stringify(result, null, 2));
    })
    .catch(reportError);
}

function reportError(result) {
  var error = _.get(result, 'response.text', _.get(result, 'response', _.get(result, 'status', result)));
  console.error(error);
  var e = error;
  try {
    var j = JSON.parse(error);
    e = j;
  } catch (err) {
    console.log("^ that err was not json");
  }
  return e;
  //      console.error(err.message);

}

function makeSwapMessage(route) {
  var outgoingTokens = _.get(route, 'srcAmount', 0) / (10 ** _.get(route, 'srcDecimals'));
  var incomingTokens = _.get(route, 'destAmount', 0) / (10 ** _.get(route, 'destDecimals'));
  var outgoingTicker = geckoClient.tickerFromContract(route.network, _.get(route, 'srcToken'));
  var incomingTicker = geckoClient.tickerFromContract(route.network, _.get(route, 'destToken'));
  return `${_.round(outgoingTokens, 3)} ${outgoingTicker} for ${_.round(incomingTokens, 3)} ${incomingTicker} (${moment().format('MMMM Do YYYY, h:mm:ss a')})`;
}

function execute(pricesResult, userAddress, mnemonic, receiver, minFeePercent) {


  var gasPrice = _.get(pricesResult, 'priceRoute.gasCost');//*6;
  var route = _.get(pricesResult, 'priceRoute');
  var chainID = route.network;
  var augustusSwap = '0xDEF171Fe48CF0115B1d80b88dc8eAB59176FEe57';
  //console.log("gas cost ", gasPrice);
  var gasPercent = 100 * route.gasCostUSD / route.destUSD;
  console.log('fee %', gasPercent);
  var message = makeSwapMessage(route);
  if (_.isNumber(minFeePercent) && gasPercent > minFeePercent) {
    return Promise.reject({ message: 'too expensive gas fee %' + _.round(gasPercent, 2) + ' for swap: ' + message });
  }

  var swapParams = _.pick(route, 'srcToken srcDecimals destToken destDecimals srcAmount destAmount'.split(' '));
  _.extend(swapParams, {
    userAddress,
    receiver,//T
    priceRoute: route,
    deadline: Math.floor(Date.now() / 1000) + 300
  });

  var url = `https://apiv5.paraswap.io/transactions/${_.get(route, 'network')}`;
  return web3.estimateGasWei(chainID, 'standard')
    .then(wei => {

      return superagent.post(url)
        .query({
          gasPrice: wei
        })
        .send(swapParams)
        .then(result => {
          var tx = _.get(result, 'body');

          if (_.isObject(tx) && tx.from == userAddress && tx.to == augustusSwap) {// <-- paraswap augustus swap
            //      return result.body
            if (process.env.ENABLE_SWAP != 0) {

              return web3.send({
                chainID,
                contractAddress: tx.to,
                mnemonic,
                methodName: null,
                parameters: null,
                tx
              }).then((x) => {
                if (_.isString(_.get(x, 'blockHash'))) {
                  // success
                  notify.notify('swap success: ' + message);
                  return x;
                } else {
                  if (_.isObject(x)) {
                    notify.notify(`swap failed: ${message}\n\n ${JSON.stringify(x, null, 2)}`);
                  } else {
                    notify.notify(`swap failed: ${message}`);
                  }
                  return Promise.reject(x);
                }
              });
            } else {
              return Promise.resolve({ message: 'swap disabled: ' + message });
            }
          } else {
            return Promise.reject(`suspicious or updated tx from paraswap (from:${_.get(tx, 'from')}, to: ${_.get(tx, 'to')})`);
          }
        })
        .catch(e => {
          var error = reportError(e);
          if (_.isObject(error) && _.get(error, 'error')) {
            if (_.includes(error.error, "allowance given to TokenTransferProxy")) {
              var txt = _.split(error.error, 'TokenTransferProxy(');
              var contract = _.trimEnd(_.last(txt), ")");
              return approve(userAddress, route.network, route.srcToken, contract, mnemonic)
                .then(() => {
                  console.log("approval complete. executing swap again");
                  return execute(pricesResult, userAddress, mnemonic, receiver, minFeePercent);
                });
            } else if (_.includes(error.error, 'please re-query')) {
              return Promise.reject('retry');
            } else {
              return Promise.reject(error.error);
            }
          } else {
            console.log("err not object", error);
            return Promise.reject(error);
          }

        });
    })
}

function approve(address, chainID, token, spender, mnemonic) {

  console.log(`infinite approve token ${chainID} ${token} for address ${address} and spender ${spender}`);
  return web3.getContract(chainID + '', token)// primes cache for next web3.send
    .then(() => {
      return web3.send({
        chainID,
        contractAddress: token,
        mnemonic,
        methodName: "approve",
        parameters: `${spender} 115792089237316195423570985008687907853269984665640564039457584007913129639935`
      })
    })

}

function lookup(chainID, fromContract, toContract, amount) {

}



module.exports = {
  lookup,
  execute,
  prepare
}