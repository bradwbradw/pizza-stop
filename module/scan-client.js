
var superagent = require('superagent');
var _ = require('lodash');
var chains = require('./chains.js');
var queue = require('./queue.js');
var fns = require('./fns.js');

function client(chainID) {

  function scanReq(params) {
    var scanUrl = _.get(chains, `${chainID}.scan`);
    if (!scanUrl) {
      return Promise.reject('please set scan URL for ' + chainID);
    }
    //    console.log('scan request ' + chainID, params);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        superagent
          .get(scanUrl)
          .query(params)
          .then(res => {
            if (params.action != 'getabi') {
              //              console.log('scan result',res.body);
            }
            if (_.isString(_.get(res, 'body.result')) || _.isArray(_.get(res, 'body.result'))) {
              resolve(res.body.result);
            } else {
              reject('result not found in scan req for chain ' + chainID, params);
            }
          })
          .catch(err => {
            console.log(scanUrl, err.status, err.response.text);
            reject('something went wrong');
          })
      }, 5000)
    });
  }

  if (!chainID || !_.isString(chainID)) {
    console.error("no chain ID given for scan client");
    throw new Error("no chain ID set for scan client");
  } else {

    var queueKey = `scan-${chainID}`;
    var delayBetweenRequests = 500;
    return {
      transactionHistory: (address, page, offset) => {
        return queue.queuedTask(() => {
          return scanReq({
            module: 'account',
            action: 'txlist',
            address,
            startblock: 0,
            endblock: 9999999999,
            page,
            offset,
            sort: "desc"
          }).catch(err => {
            return Promise.resolve([]);
          })
          // https://api.ftmscan.com/api?startblock=0&endblock=99999999&page=1&offset=10&sort=desc&apikey=YourApiKeyToken
        },
          queueKey,
          delayBetweenRequests
        );
      },
      tokenSupply: (contractaddress) => {
        return queue.queuedTask(
          () => {
            return scanReq({
              module: 'stats',
              action: 'tokensupply',
              contractaddress
            });
          },
          queueKey,
          delayBetweenRequests
        );
      },
      tokenBalance: (contractaddress, address) => {
        console.log(`${chainID} ${contractaddress} get tokenBalance for ${address}`);
        return queue.queuedTask(
          () => {
            return scanReq({
              module: 'account',
              action: 'tokenbalance',
              contractaddress,
              address,
              tag: 'latest'
            });
          },
          queueKey,
          delayBetweenRequests
        );
      },
      gas: () => { },//https://api.bscscan.com/api?module=gastracker&action=gasoracle&apikey=YourApiKeyToken
      abi: (address) => {
        return queue.queuedTask(
          () => {
            return scanReq({
              module: 'contract',
              action: 'getabi',
              address
            });
          },
          queueKey,
          delayBetweenRequests
        );
      }
    }
  }


}



module.exports = {
  client
}
