const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const moment = require("moment");
const when = require("when");
const ccxt = require("@mareksokol/ccxt");

const user = require("./user.js");

module.exports = app => {


  var exchanges = {};
  var userExchanges = {};

  function getExchangeLib(exchange, userKey){
    return new Promise((resolve, reject)=>{

      if (userKey){

        var lib = _.get(userExchanges, `${userKey}.${exchange}`);
        if (!_.isObject(lib)) {
          var e = _.get(ccxt, exchange);
          user({apiKey:userKey})
            .then(user =>{

              if (_.isFunction(e) && _.isString(_.get(user,`exchangeKeys.${exchange}.apiKey`))) {
                lib = new e({
                  enableRateLimit: true,
                  apiKey: user.exchangeKeys[exchange].apiKey,
                  secret: user.exchangeKeys[exchange].secret
                });
                _.set(userExchanges, `${userKey}.${exchange}`, lib);
                resolve(lib);
              } else {
                reject(new Error(`cannot get user exchange lib "${exchange}" for key ${userKey}`));
              }
            })
            .catch(err => {
              reject(err);
            });
        } else {
          resolve(lib);
        }
      } else {
        var lib = _.get(exchanges, exchange);
        if (!_.isObject(lib)) {
          var e = _.get(ccxt, exchange);
          if (_.isFunction(e)) {
            console.log("making new exchange lib "+exchange);
            lib = new e({ enableRateLimit: true });
            _.set(exchanges, exchange, lib);
          }
        }
        resolve(lib);
      }
    });
  }


  function findCcxtMethod(paramArr, exchange, req, res) {
      function find(arr, exchange){
        return getExchangeLib(exchange, _.get(req.query, "key"))
          .then(exchangeLib => {

            var params = _.filter(arr, _.isString);
            var fnPath = params.join(".");
            console.log("exchange function path", fnPath);

            var r;
            var methodParams = req.query.methodParams;//null;
            try {
             // var fnParams = JSON.parse();
            } catch (err) {
              //console.error("error json parsing " + req.query.params);
            }

            console.log("method params", JSON.stringify(methodParams, null, 2));

            if (exchange && _.isFunction(_.get(exchangeLib,fnPath))) {
              if (_.isArray(methodParams)) {
                r = exchangeLib[fnPath](...methodParams);
              } else {
                r = exchangeLib[fnPath]();
              }
            } else if (_.isFunction(_.get(ccxt, fnPath))) {
              if (_.isArray(methodParams)) {
                r = ccxt[fnPath](...methodParams);
              } else {
                r = ccxt[fnPath]();
              }
            } else if (_.isObject(_.get(ccxt,fnPath)) || _.isArray(_.get(ccxt,fnPath))) {
              r = Promise.resolve(ccxt[fnPath]);
            } else {
              r = Promise.reject({
                message: `unable to find fn for exchange ${exchange}, fnPath ${fnPath}`
              });
            }

            if (when.isPromiseLike(r)) {
              return r;
            } else {
              console.log(
                `ccxt function at path ${exchange}.${fnPath} did not return a promise`
              );
          //      res.json(r);
              return Promise.resolve(r);
            }
          });
      }

    if (exchange == "exchanges"){
      console.log('fetching ticker from binance...');
      find(paramArr, 'binance')
      .catch(()=>{
        console.log('binance failed, fetching ticker from bitfinex...');
        return find(paramArr, 'bitfinex');
      })
      .catch(() => {
        console.log('bitfinex failed, fetching ticker from kraken...');
        return find(paramArr, 'kraken');
      })
      .catch(() => {
        console.log('kraken failed, fetching ticker from coinbase...');
        return find(paramArr, 'coinbase');
      })
      .catch(() => {
        console.log('coinbase failed, fetching ticker from huobi...');
        return find(paramArr, 'huobi');
      })
      .catch((err) => {
        console.error('all exchanges failed', err);
        res.status(400).json({message: `method not found, or asset not available`});
      })
      .then(result => {
        res.json(result);
      })
    } else {

      find(paramArr, exchange)
        .then(result => {
          res.json(result);
        })
        .catch(err => {
          res.status(400).json({error:err.message});
        });
    }
  }
  app.get("/ccxt/:first", function(req, res) {
    findCcxtMethod([req.params.first], null, req, res);
  });
  app.get("/ccxt/:first.:second", function(req, res) {
    findCcxtMethod([req.params.first, req.params.second], null, req, res);
  });
  app.get("/ccxt/:first.:second.:third", function(req, res) {
    findCcxtMethod(
      [req.params.first, req.params.second, req.params.third],
      null,
      req,
      res
    );
  });
  app.get("/ccxt/:first.:second.:third.:fourth", function(req, res) {
    findCcxtMethod(
      [
        req.params.first,
        req.params.second,
        req.params.third,
        req.params.fourth
      ],
      null,
      req,
      res
    );
  });

  app.get("/ccxt/:exchange/:first", function(req, res) {
    findCcxtMethod([req.params.first], req.params.exchange, req, res);
  });
  app.get("/ccxt/:exchange/:first.:second", function(req, res) {
    findCcxtMethod(
      [req.params.first, req.params.second],
      req.params.exchange,
      req,
      res
    );
  });
  app.get("/ccxt/:exchange/:first.:second.:third", function(req, res) {
    findCcxtMethod(
      [req.params.first, req.params.second, req.params.third],
      req.params.exchange,
      req,
      res
    );
  });
  app.get("/ccxt/:exchange/:first.:second.:third.:fourth", function(req, res) {
    findCcxtMethod(
      [
        req.params.first,
        req.params.second,
        req.params.third,
        req.params.fourth
      ],
      req.params.exchange,
      req,
      res
    );
  });

};
