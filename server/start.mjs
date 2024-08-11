
import express from "express";
import fs from "fs";
import dotenv from "dotenv";
import _ from "lodash";
import bodyParser from "body-parser";

import path from "path";

//const btcClient = await import('bitcoin-core');
// https://www.smartbit.com.au/api


const app = express();

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
//require('dotenv').config({path: path.resolve(process.cwd(), '.env.prod')});

var port = process.env.PORT || 5678;
var domain = "localhost:" + port;

if (process.env.DOMAIN) {
  domain = process.env.DOMAIN;
}

//const user = await import('./user.js');
const web3 = await import('../module/web3-client.js');
const chains = await import('../module/chains.js');

const balance = await import("./balance.js");
import monitor from "./monitor.mjs";
const notify = await import("./notify.js");
const assetData = await import("./asset-data.js");
const HDWalletProvider = await import("@truffle/hdwallet-provider");
//const googleSheets = await import("./google-sheets.js");
//const { resolveNaptr } = await import('dns');

Promise.all(_.map("gecko-swagger.json".split(" "), doc =>{
  return new Promise((resolve, reject)=>{
    fs.readFile(`./${doc}`, "utf8", resolve);
  }) ;
//  return import(`./${doc}`);
})).then((docs) => {
  _.each(docs, (doc) => {
    app.get(`/${doc}`, (req, res) => {
      res.json(doc);
    });
  });
});

//geckoClient.setup(domain);
//moralisClient.setup(domain);

//threeCommasClient.setup(domain);

monitor.startSchedule();

//const coin = require('./coin-data.js');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// setup static route for /book-dapp, mapped to /book-dapp/dist
app.use("/book-dapp", express.static("book-dapp/dist"));
app.use("/testpics", express.static("book-dapp/test"));

app.use(function (req, res, next) {
  _.each(_.toPairs(req.query), (pair) => {
    var parsedObj;
    try {
      parsedObj = JSON.parse(_.last(pair));
    } catch (err) {
      // console.error(err);
    }
    // if parsedObj is array or obj, set special req property for access later
    if (_.isArray(parsedObj) || _.isObject(parsedObj)) {
      _.set(req.query, _.first(pair), parsedObj);
    }
  });
  next();
});

var assetHandler = (req, res) => {
  var tickers;
  if (_.get(req.params, "ticker")) {
    tickers = req.params.ticker;
  } else if (_.get(req.query, "ticker")) {
    tickers = req.query.ticker;
  } else if (_.get(req.query, "tickers")) {
    tickers = req.query.tickers;
  }

  if (tickers) {
    assetData.assets(tickers.split(" ")).then((result) => {
      res.json(result);
    });
  } else {
    res.status(500).json({
      error: "no ticker was provided after / in url, or as ?ticker param",
    });
  }
};

app.get("/price/:ticker", assetHandler);
app.get("/asset/:ticker", assetHandler);
app.get("/asset", assetHandler);
app.get("/price", assetHandler);

app.get("/read-contract", (req, res) => {
  var o = populateParams(
    req,
    "chainID contractAddress address methodName parameters returnIndeces"
  );

  console.log("/read-contract", o);
  web3
    .callContractMethod(o)
    .then((d) => {
      if (
        _.isString(_.get(req.query, "returnIndeces")) &&
        !_.isEmpty(req.query.returnIndeces)
      ) {
        d = _.get(d, req.query.returnIndeces);
      }
      res.json(_.extend(o, { result: d }));
    })
    .catch((err) => {
      res.status(500).json({ error: err });
    });
});

app.get("/abi", (req, res) => {
  console.log("/abi", req.query);
  web3
    .getContract(
      _.get(req, "query.chainID"),
      _.get(req, "query.contractAddress")
    )
    .then((contract) => {
      console.log(contract.options.jsonInterface);
      res.json({
        abi: JSON.stringify(_.get(contract, "options.jsonInterface")),
      });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "something went wrong" });
    });
});

function populateParams(req, stringList) {
  var arr = stringList.split(" ");
  var o = {};
  _.each(arr, (str) => {
    _.set(o, str, _.get(req, "query." + str));
  });
  return o;
}

// wallet balance
app.get("/balance", (req, res) => {
  var o = populateParams(req, "chainID ticker address tryPrefixes");

  var tickers = [o.ticker];

  if (_.isString(_.get(o, "tryPrefixes")) && _.size(o.tryPrefixes) > 0) {
    tickers = _.concat(
      tickers,
      _.map(o.tryPrefixes.split(" "), (prefix) => `${prefix}${o.ticker}`)
    );
    //      console.log('then tickers is', tickers)
  }
  _.set(o, "tickers", tickers);
  //console.log('o', o);
  balance
    .get(o)
    .then((balance) => {
      res.json(_.extend(o, balance));
    })
    .catch((err) => {
      console.error("error? " + err);
      res.status(500).json({ err });
    });
});

function qEmpty() {
  return _.size(q) == 0;
}


var listener = app.listen(port, () => {
  console.log(`listening on port ${listener.address().port}`);
});

app.get("/test-notify", (req, res) => {
  notify.test();
  res.json({ tested: true, events: notify.getEvents() });
});

app.get("/batch", (req, res) => {
  var module = req.query.module;
  if (_.isString(module)) {
    res.json({ error: "no module param was found ( start.js )" });
  } else {
    var tickers = req.query.tickers.split(" ");
    var chainIDs = req.query.chainIDs.split(" ");
    var addresses = req.query.addresses.split(" ");
    var data = {};

    var pp = Promise.resolve();
    _.each(chainIDs, (chainID) => {
      pp = pp.then(() => {
        data[chainID] = {};
        var p = Promise.resolve();
        _.each(addresses, (address) => {
          p = p.then(() => {
            return balance
              .get({
                chainID,
                address,
                tickers,
              })
              .then((b) => {
                data[chainID][address] = b;
              });
          });
        });
        return p;
      });
    });
    return pp
      .then((r) => {
        res.json(data);
      })
      .catch((err) => {
        res.status(500).json(err);
      });
  }
});

function nice(i) {
  return JSON.stringify(i, null, 2);
}

if (process.env.NODE_ENV == "production") {
  //  notify.notify("deployed prod " + moment().format('MMMM Do YYYY, h:mm:ss a'));
}

//seedWallets("43114", [2, 5], 0.005)

function seedWallets(chainID, addressArr, number) {
  var timeout = 30;
  var p = Promise.resolve();
  addressArr.map((addressIndex) => {
    var provider = new HDWalletProvider({
      mnemonic: process.env.BOT_MNEMONIC,
      providerOrUrl: _.get(chains, `${chainID}.http`),
      addressIndex,
    });
    console.log(addressIndex, " " + provider.getAddress());
    //return;
    p = p.then(() => {
      return web3
        .sendNativeTokens({
          chainID: chainID, //"43114",//"137",
          from: process.env.BOT,
          to: provider.getAddress(),
          mnemonic: process.env.BOT_MNEMONIC,
          number,
        })
        .then(() => {
          return new Promise((resolve, reject) => {
            console.log(
              `completed send from 0 to ${addressIndex}. waiting ${timeout} seconds...`
            );
            setTimeout(resolve, timeout * 1000);
          });
        });
    });
  });

  return p
    .then(() => {
      console.log("all seedWallets done for " + chainID);
    })
    .catch((err) => {
      console.log("well an error happened ", err.message);
    });
}


//monitor.runJobOnce("update asset data");

app.get("/jobs/:jobName", (req, res) => {
  console.log(req.params);
  monitor
    .runJobOnce(req.params.jobName)
    .then((result) => {
      res.json(result);
    })
    .catch((result) => {
      console.log(result);
      res.json({ error: "something went wrong" });
    });
});


//monitor.runJobOnce("check health");
//monitor.runJobOnce("update assets");
//.then(() => xen.claimRanks("137", [1, 2, 3, 4, 5, 6, 7, 8, 9], 7))
/*.then(() => */
//xen.harvestXen("43114", [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20])
/*
xen.claimRanks("1284", [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], 14)
  .then(() => {
    return { message: "14 day mint xen actions completed" };
  });

  */
