const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const moment = require('moment');
const express = require('express');
const bodyParser = require('body-parser');

var doPublicBuild = require('./do-public-build.js');

const { hashElement } = require('folder-hash');

var componentsPath = path.resolve(__dirname, '../component');

var bundlePath = path.resolve(__dirname, './bundle.js');

Promise.all([
  hashElement(componentsPath, {}),
  hashElement(bundlePath, {})
])
  .then(([cHashObj, bHashObj]) => {
    var cHash = _.get(cHashObj, 'hash', "");
    var bHash = _.get(bHashObj, 'hash', "");
    var hash = cHash + bHash;
    //    console.log('public files hash ', hash);
    var oldHash = cache.checkPersistent('components-hash');
    if (oldHash !== hash) {
      cache.setPersistent('components-hash', hash);
      doBuild = true;
      console.log('will build public js');
      doPublicBuild(componentsPath, bundlePath);
    } else {
      //console.log('skip building public');
    }

  })
  .catch(error => {
    console.error('hashing failed:', error);
  });


//end build step

//const btcClient = require('bitcoin-core');
// https://www.smartbit.com.au/api

const app = express();

require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
//require('dotenv').config({path: path.resolve(process.cwd(), '.env.prod')});

var port = process.env.PORT;
var domain = 'localhost:' + port;

if (process.env.DOMAIN) {
  domain = process.env.DOMAIN;
}
const PS = require('./bundle.js');
const db = require('./db.js');
//const user = require('./user.js');
const contractBalance = require('./contract-balance.js');
const web3 = PS.web3;//require('./web3-client.js');
const geckoClient = PS.geckoClient;//require('./gecko-client.js');;//PS.geckoClient;//
const chains = PS.chains;//require('./chains.js');
const cache = PS.cache;// require('../module/cache.js');
const transactionHistory = PS.transactionHistory;//require('../module')

const balance = require('./balance.js');
const moralisClient = require('./moralis-client.js');
const threeCommasClient = require('./3commas-client.js');
const cex = require('./ccxt-proxy.js');
const monitor = require('./monitor.js');
const notify = require('./notify.js');
const assetData = require('./asset-data.js');
const HDWalletProvider = require('@truffle/hdwallet-provider');
const googleSheets = require('./google-sheets.js');
//const { resolveNaptr } = require('dns');

geckoClient.setup(domain);
moralisClient.setup(domain);
//threeCommasClient.setup(domain);

monitor.startSchedule();


//const coin = require('./coin-data.js');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));
app.use(express.static("component"));

app.use(function (req, res, next) {
  _.each(_.toPairs(req.query), pair => {
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

_.each("gecko-swagger.json moralis-swagger.json 3commas-swagger.json".split(' '), doc => {
  app.get(`/${doc}`, (req, res) => {
    res.json(require(`./${doc}`));
  })
});

var assetHandler = (req, res) => {
  var tickers;
  if (_.get(req.params, 'ticker')) {
    tickers = req.params.ticker;
  } else if (_.get(req.query, 'ticker')) {
    tickers = req.query.ticker;
  } else if (_.get(req.query, 'tickers')) {
    tickers = req.query.tickers;
  }

  if (tickers) {
    assetData.assets(tickers.split(' '))
      .then(result => {
        res.json(result);
      })
  } else {
    res.status(500).json({ error: "no ticker was provided after / in url, or as ?ticker param" });
  }
};


app.get("/price/:ticker", assetHandler);
app.get("/asset/:ticker", assetHandler);
app.get("/asset", assetHandler);
app.get("/price", assetHandler);

app.get("/contract-balance", (req, res) => {
  var o = populateParams(req, 'chainID contractAddress address assets lpTokenContract targetAsset');
  contractBalance.get(o)
    .then(d => {
      res.json(_.extend(o, d));
    })
    .catch(err => {
      res.status(500).json({ error: err });
    })
});

app.get("/read-contract", (req, res) => {

  var o = populateParams(req, "chainID contractAddress address methodName parameters returnIndeces");

  console.log('/read-contract', o);
  web3.callContractMethod(o)
    .then(d => {
      if (_.isString(_.get(req.query, 'returnIndeces')) && !_.isEmpty(req.query.returnIndeces)) {
        d = _.get(d, req.query.returnIndeces);
      }
      res.json(_.extend(o, { "result": d }));
    })
    .catch(err => {
      res.status(500).json({ error: err });
    })
});

app.get("/abi", (req, res) => {
  web3.getContract(req.query.chainID, req.query.contractAddress)
    .then(contract => {
      console.log(contract.options.jsonInterface);
      res.json({ abi: JSON.stringify(_.get(contract, 'options.jsonInterface')) });
    })
});


function populateParams(req, stringList) {
  var arr = stringList.split(' ');
  var o = {};
  _.each(arr, str => {
    _.set(o, str, _.get(req, 'query.' + str));
  });
  return o;
}

// wallet balance
app.get("/balance", (req, res) => {
  var o = populateParams(req, "chainID ticker address tryPrefixes");

  var tickers = [o.ticker];

  if (_.isString(_.get(o, 'tryPrefixes')) && _.size(o.tryPrefixes) > 0) {

    tickers = _.concat(tickers,
      _.map(o.tryPrefixes.split(' '), prefix => `${prefix}${o.ticker}`));
    //      console.log('then tickers is', tickers)
  }
  _.set(o, 'tickers', tickers);
  //console.log('o', o);
  balance.get(o)
    .then(balance => {
      res.json(_.extend(o, balance));
    })
    .catch(err => {
      console.error("error? " + err);
      res.status(500).json({ err });
    });
});

app.get('/balance/:exchange/:ticker', (req, res) => {
  if (_.isString(req.query.userKey)) {
    var o = {
      exchange: req.params.exchange,
      ticker: req.params.ticker,
      userKey: req.query.userKey
    };
    balance.cexGet(o).then(b => {
      res.json(_.extend(o, { balance: b }));
    }).catch(err => {
      console.error(err)
      res.status(400).json({ error: "something went wrong" });
    })
  }
});


function qEmpty() {
  return _.size(q) == 0;
}

app.get("/", (request, response) => {
  //response.send("boogie");
  fs.readFile(`${__dirname}/public/index.html`, 'utf8',
    (err, file) => {
      if (err) throw err;
      //      console.log(data);
      response.send(file);
    });

});

require('./price-history.js')(app);
cex.setupRoutes(app);

app.get('/test-db', (req, res) => {
  try {
    console.log("setting up db");
    var dolphinCoinPrices = db({ currency: 'Dolph', quoteCurrency: 'USD' });
    console.log("trying to set and get from db");
    dolphinCoinPrices
      .then((db) => {
        console.log("upsert");
        db.upsert([
          { millis: 12345, price: 3.320000001 },
          { millis: 12346, price: 3.3300010001 },
          { millis: 12347, price: 3.334000091 }
        ])
          .then(() => {
            return db.upsert([
              { millis: 12346, price: 3.3401010101 },
              { millis: 12348, price: 4.101010001 }
            ]);
          })
          .then(() => {
            console.log("get");
            return db.get(12346)
          })
          .then(() => {
            console.log("getRange");
            return db.getRange(12300, 12400);
          })
          .then(result => {
            console.log(nice(result));
            res.json({ result });
          })
          .catch(err => {
            res.json({ error: err });
          })
      })
      .catch(err => {
        res.json({ bigError: err });
      });
  }
  catch (error) {
    console.error(error);
    res.json({ error: "something went wrong" });
  }
});

var listener = app.listen(process.env.PORT, () => {
  console.log(`port ${listener.address().port}`);
});

app.get('/test-notify', (req, res) => {
  notify.test();
  res.json({ tested: true, events: notify.getEvents() });
});
app.get('/portfolio/:key/:sinceDateGMT', (req, res) => {

  if (!_.isEmpty(req.params.key) &&
    _.isString(req.params.key) &&
    !_.isEmpty(req.params.sinceDateGMT) &&
    _.isString(req.params.sinceDateGMT)) {

    cex.portfolio(req.params)
      /*.then(sorted => {
  
        var output = "";
        function append(s) {
          if (!s) { s = ""; }
          console.log(s);
          output = output + "<br/>" + s;
        }
        _.each(sorted, s => {
  
  
          append(`total bought ${s.buyAmount} ${s.ticker} for ${s.buyCost}, avg buy price is ${s.buyAvg}`);
          append(`total sold ${s.sellAmount} ${s.ticker} for ${s.sellCost}`);
          append(`current balance of ${s.ticker} is ${s.buyAmount - s.sellAmount}`);
          append(`~~~~~~~~ ${s.ticker} ($${s.price}) if sell, get ${s.value} making ${s.profit} profit`);
          append();
          append();
        });
        return output;
      })*/
      .then(r => {

        res.send(r);
      })
      .catch(e => {
        console.error(e);
        res.status(444).json(e);
      })
  } else {
    res.status(444).json({ error: '/portfolio/:key/:date with date in GMT time (YYYY-MM-DDThh:mm:ssZ)' })
  }
})

app.get('/batch', (req, res) => {
  var module = req.query.module;
  if (_.isString(module)) {
    res.json({ error: 'no module param was found ( start.js )' });
  } else {
    var tickers = req.query.tickers.split(' ');
    var chainIDs = req.query.chainIDs.split(' ');
    var addresses = req.query.addresses.split(' ');
    var data = {};

    var pp = Promise.resolve();
    _.each(chainIDs, chainID => {
      pp = pp.then(() => {
        data[chainID] = {};
        var p = Promise.resolve();
        _.each(addresses, address => {
          p = p.then(() => {
            return balance.get({
              chainID,
              address,
              tickers
            }).then(b => {
              data[chainID][address] = b;
            })
          });
        });
        return p;
      });
    })
    return pp.then(r => {
      res.json(data);
    }).catch(err => {
      res.status(500).json(err);
    })
  }
});

function nice(i) {
  return JSON.stringify(i, null, 2);
}

if (process.env.NODE_ENV == 'production') {
  //  notify.notify("deployed prod " + moment().format('MMMM Do YYYY, h:mm:ss a'));
}


//seedWallets("43114", [2, 5], 0.005)

function seedWallets(chainID, addressArr, number) {

  var timeout = 30;
  var p = Promise.resolve();
  addressArr.map(addressIndex => {
    var provider = new HDWalletProvider({
      mnemonic: process.env.BOT_MNEMONIC,
      providerOrUrl: _.get(chains, `${chainID}.http`),
      addressIndex
    })
    console.log(addressIndex, ' ' + provider.getAddress());
    //return;
    p = p.then(() => {
      return web3.sendNativeTokens({
        chainID: chainID, //"43114",//"137",
        from: process.env.BOT,
        to: provider.getAddress(),
        mnemonic: process.env.BOT_MNEMONIC,
        number
      }).then(() => {
        return new Promise((resolve, reject) => {
          console.log(`completed send from 0 to ${addressIndex}. waiting ${timeout} seconds...`);
          setTimeout(resolve, timeout * 1000);
        });
      })
    });
  });

  return p.then(() => {
    console.log('all seedWallets done for ' + chainID);
  }).catch((err) => {
    console.log("well an error happened ", err.message);
  });
}

function donkeys() {

  var P = Promise.resolve({});

  var donks = cache.checkPersistent('donkeys');
  var begin = 0;
  var end = 9000;
  if (donks) {
    begin = _.maxBy(_.keys(donks), _.parseInt);
  }
  _.each(_.range(begin, end), n => {
    P = P.then((map) => {
      return web3.callContractMethod({
        chainID: "42161",
        contractAddress: "0x27f970F2164195Cf898AA03619e2783ffAdE8513",
        methodName: "isBarnClaimedForToken",
        parameters: "" + n
      }).then(result => {
        var d = cache.checkPersistent('donkeys');
        if (!d) {
          d = {};
        }
        cache.setPersistent('donkeys', _.set(d, n, result));
        return _.set(map, n, result);
      }).catch(err => {
        console.error('dnokeys broken', err);
      })
    })
  });

  P.then(m => {
    console.log('got donkeys: ');
  })
}


app.get('/history', (req, res) => {
  var o = populateParams(req, "address numTransactions");
  transactionHistory.addressDeposits(o)
    .then(r => res.json(r))
    .catch(r => req.json({ errors: 'occurred' }));
});

app.get('/donkeys', (req, res) => {
  var d = cache.checkPersistent('donkeys');
  if (_.isObject(d)) {
    res.json(d);
  } else {
    res.json({
      error: 'sorry, no donkeys'
    });
  }
});

app.get('/rescan-donkeys', (req, res) => {
  donkeys();
  res.json({ rescanning: true });
})
/*
var count = 0;

app.get('/count', (req, res) => {
  res.json({ count: count++ });
});

*/

// var xen = require('../module/xen.js');
//seedWallets("250", [18, 19, 20], 0.1);//13, 14, 15, 16, 17, 18, 19, 20], 1)
//xen.harvestXen("137", [5, 6, 7, 8, 9])
//.then(() => xen.claimRanks("137", [1, 2, 3, 4, 5, 6, 7, 8, 9]))
// /*.then(() => xen.harvestXen("43114", [5])//6, 7, 8, 9])//)
//.then(() => xen.claimRanks("137", [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]))//1, 2, 3, 4, 5, 6, 7, 8, 9]))
//.then((results) => {
//  console.log(results);
//   return { message: "all xen actions completed" };
// }).catch(e => {
//   console.log(e);
// });*/


//
//.then(() => xen.claimRanks("137", [1, 2, 3, 4, 5, 6, 7, 8, 9], 7))
/*.then(() => */
//xen.harvestXen("43114", [5])
/*
xen.claimRanks("1284", [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], 14)
  .then(() => {
    return { message: "14 day mint xen actions completed" };
  });

  */