const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const moment = require("moment");
const when = require("when");
const ccxt = require("@mareksokol/ccxt");

module.exports = app => {
  var exchanges = {};

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

  function findCcxtMethod(arr, exchange, req, res) {
    
    if (exchange == "exchanges"){
      console.log('fetching ticker from binance...');
      find(arr, 'binance')
      .catch(()=>{
        console.log('binance failed, fetching ticker from bitfinex...');
        return find(arr, 'bitfinex');
      })
      .catch(() => {
        console.log('bitfinex failed, fetching ticker from kraken...');
        return find(arr, 'kraken');
      })
      .catch(() => {
        console.log('kraken failed, fetching ticker from coinbase...');
        return find(arr, 'coinbase');
      })
      .catch(() => {
        console.log('coinbase failed, fetching ticker from huobi...');
        return find(arr, 'huobi');
      })
      .catch((err) => {
        console.error('all exchanges failed', err);
        res.status(500).json({message:"internal error"});
      })
      .then(result => {
        res.json(result);
      })
    } else {
      
      find(arr, exchange)
        .then(result => {
          res.json(result);
        })
        .catch(err => {
          res.status(400).json({error:err.message});
        });
    }
    
    function find(arr, exchange){
      var exchangeLib = _.get(exchanges, exchange);
      if (!_.isObject(exchangeLib)) {
        var e = _.get(ccxt, exchange);
        if (_.isFunction(e)) {
          console.log("L119 new "+e);
          exchangeLib = new e({ enableRateLimit: true });
          _.set(exchanges, exchange, exchangeLib);
        }
      }

      console.log(arr);
      var params = _.filter(arr, _.isString);
      var fnPath = params.join(".");

      var r;
      var fnParams = req.query.params;//null;
      try {
       // var fnParams = JSON.parse();
      } catch (err) {
        //console.error("error json parsing " + req.query.params);
      }
      console.log("params", JSON.stringify(fnParams, null, 2));

      if (exchange && _.isFunction(exchangeLib[fnPath])) {
        if (_.isArray(fnParams)) {
          r = exchangeLib[fnPath](...fnParams);
        } else {
          r = exchangeLib[fnPath]();
        }
      } else if (_.isFunction(ccxt[fnPath])) {
        if (_.isArray(fnParams)) {
          r = ccxt[fnPath](...fnParams);
        } else {
          r = ccxt[fnPath]();
        }
      } else if (_.isObject(ccxt[fnPath]) || _.isArray(ccxt[fnPath])) {
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
    }
  }
};
