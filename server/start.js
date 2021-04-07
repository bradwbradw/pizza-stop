const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const moment = require('moment');
const ccxt = require ('@mareksokol/ccxt');

// ccxt docs links:
// https://github.com/ccxt/ccxt/wiki/Manual#price-tickers
// https://github.com/ccxt/ccxt/wiki/Manual#exchanges
// https://github.com/ccxt/ccxt/wiki/Manual#unified-api


const express = require('express');
const bodyParser = require('body-parser');
const btcClient = require('bitcoin-core');
// https://www.smartbit.com.au/api
const app = express();

require('dotenv').config();

const db = require('./db.js');
const user = require('./user.js');
//const coin = require('./coin-data.js');


var port = process.env.PORT;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));

app.use(function (req, res, next) {
  _.each(_.toPairs(req.query), pair => {
    var parsedObj;
    try {
      parsedObj = JSON.parse(_.last(pair));
    } catch (err){
     // console.error(err);
    }
    // if parsedObj is array or obj, set special req property for access later
    if (_.isArray(parsedObj) || _.isObject(parsedObj)){
      _.set(req.query, _.first(pair), parsedObj);
    }
  });
  next();
});

app.post("/portfolio", (request, response ) => {
  var portfolio = JSON.stringify(request.body, null, 2);

  response.json({portfolio});
});

app.post("/coin", (req, res) =>{

});


app.get("/", (request, response) => {
  //response.send("boogie");
  fs.readFile(`${__dirname}/public/index.html`, 'utf8',
              (err, file) => {
      if (err) throw err;
//      console.log(data);
    response.send(file);
    });

});
var opts = {
  enableRateLimit:true
}
var exchanges = {
  kraken: new ccxt.kraken(opts),
  bitfinex: new ccxt.bitfinex2(opts),
  huobi: new ccxt.huobipro(opts),
  binance: new ccxt.binance(opts),
  coinbase: new ccxt.coinbasepro(opts)
}

app.get("/price-data", (request, response) => {

  _.defaults(request.query, {
    currency:'ETH',
    quoteCurrency:'USD',
    beginDate: moment().subtract(1, 'hour'), // -1 hour from now
    endDate: moment(),
    tradesPerMinute: 0.2,
    params:{}
  });

  var millis;
  var end;

  try {
    var millis = parseInt(moment(request.query.beginDate).format('x'));
    var end = parseInt(moment(request.query.endDate).format('x'));
  } catch (err){
    console.error(err);
  }

  console.log(JSON.stringify({millis}, null, 2));
  var interval = _.round(60000 / request.query.tradesPerMinute);
  console.log(`${request.query.tradesPerMinute} trades pet minute works out to a ${interval} ms interval`)
  var fetches = _.range(millis, end, interval);

  if(_.isNumber(millis) && _.isNumber(end)){

    getPrices(request.query,fetches)
    .then(r => {
      response.json(r);
    })
    .catch(err => {
      response.status(400).json(err);
    })
  } else {
    response.status(400).json({message:`got start millis "${millis}" and end millis "${end}"`})
  }

  /*
  fetchBatch({symbol:request.query.symbol, millis, end})
    .then(trades => {
    response.json(trades);
  })*/
});

app.get("/user", (req, res) => {
  var k = req.query.apiKey;
  var pairArray = req.query.pairArray;
  if (_.isString(k) && _.isArray(pairArray)){
    user({apiKey:k})
    .then(u =>{
      //console.log("user fns", JSON.stringify(u, null, 2));
      u.history.get({
          exchangeArray:['binance', 'kraken'],
          pairArray})
      .then(r =>{
        //console.log("user", r);
        res.json(r);
      })
      .catch(err =>{
        console.error(err);
        res.status(500).json({error:err.message});
      })
    })
    .catch(err => {
        console.error("problem",err);
      res.status(500).json(err);
    })
  } else if (_.isString(pairArray)){
    res.status(500).json({error:"pair array was not json parsed"});
  } else {
    res.status(500).json({error:"no apiKey parameter found"});
  }
});
function getPrices(query, milliList){

  return new Promise((resolve, reject) => {

    db({
      currency: query.currency,
      quoteCurrency:query.quoteCurrency
    })
    .then(db => {

      var p = Promise.resolve();
      var data = [];

      _.each(milliList, m => {
        p = p.then(() => {return getCacheOrFetch(db,m);})
          .then((d) => {
//            console.log("new data", d);
            data.push(d);
            console.log( 100 *_.size(data) / _.size(milliList),'%...');
          return;
        })
    .catch(reject);

      });

      p = p.then(() => {
        resolve({prices:data});
      });
    })
    .catch(reject);

  });
}



function getCacheOrFetch(db, m) {

  return new Promise((resolve, reject) => {
    db.get(m)
    .then(result =>{
      if(result){
//        console.log('cached', result);
        resolve(result);
      } else {

        fetchData({
          symbol:`${db.currency}/${db.quoteCurrency}`,
          since:m,
          limit:1,
          params:{}
        })
        .then(data => {
          var price = _.get(_.first(data), 'price');
          if (_.isNumber(price)){
//            console.log('saving', m, price);
            db.upsert([{millis:m, price}])
            .then(resolve)
            .catch(reject);

          } else {
            reject('bad price fetched from bitfinex: '+ price)
          }
        })
        .catch(reject);
      }
    })
    .catch(reject);
  });
}





function fetchBatch({symbol, millis, end}){
  return fetchData({symbol, since:millis})
    .then(trades => {
      millis = _.get(_.last(trades), 'timestamp');
      console.log(millis);
      if (millis < end){
        return fetchBatch({symbol, millis, end})
        .then(trades2 => {
          return _.union(trades,trades2);
        })
      } else {
        console.log('done. '+_.size(trades)+' trades found' );
        return trades;
      }
  })
}

function fetchData({symbol, since, limit, params}){
  console.log('requesting to bitfinex...', {symbol, since, limit, params});
  return exchanges.bitfinex.fetchTrades(symbol, since, limit, params)
  .catch(err => {
    console.log('bitfinex failed. trying binance...', {symbol, since, limit, params});
    return exchanges.binance.fetchTrades(symbol, since, limit, params);
  })
  .catch(err => {
    console.log('binance failed. trying huobi...', {symbol, since, limit, params});
    return exchanges.huobi.fetchTrades(symbol, since, limit, params);
  })
  .catch(err => {
    console.log('huobi failed. trying coinbase...', {symbol, since, limit, params});
    return exchanges.coinbase.fetchTrades(symbol, since, limit, params);
  })
  .catch(err => {
    console.log('coinbase failed. trying kraken...', {symbol, since, limit, params});
    return exchanges.kraken.fetchTrades(symbol, since, limit, params);
  })
  .then(cleanTrades)
}

function cleanTrades(data){
  return _.map(data, d => {
    return _.pick(d, 'id datetime symbol side price'.split(' '));
  });
}


app.get('/test-db', (req, res) => {
  var dolphinCoinPrices = db({currency:'Dolph', quoteCurrency:'USD'});

  dolphinCoinPrices
    .then((db) => {
      db.upsert([
          {millis:12345, price: 3.320000001},
          {millis:12346, price: 3.3300010001},
          {millis:12347, price: 3.334000091}
      ])
      .then(() => {
        return db.upsert([
          {millis:12346, price:3.3401010101},
          {millis:12348, price: 4.101010001}
        ]);
      })
      .then(() =>{
        return db.get(12346)
      })
    .then(() => {
        return db.getRange(12300, 12400);
      })
      .then(result => {
        res.json({result});
      })
      .catch(err =>{
        res.json({error:err});
      })
    })
    .catch(err => {
      res.json({bigError:err});
    });
});
//app.get('/ccxt-proxy', require('./ccxt-proxy.js'));
require('./ccxt-proxy.js')(app);


// listen for requests :)
var listener = app.listen(process.env.PORT, () => {
  console.log(`Your app is listening on port ${listener.address().port}`);
});

/*

app.get("/`candlesticks`", (request, response) => {
  console.log('loading markets...');
  var symbol = _.get(request, 'query.symbol');
  _.defaults(_.get(request, 'query'), {
    symbol:'ETH/BTC',
    since: moment(exchanges.bitfinex.milliseconds ()).subtract(4, 'months'), // -1 day from now
    timeframe: '1h',
    limit:50,
    params:{}
  });
  if (!symbol){
    response.status(400).json({message:'please set symbol query param'});
  } else {
    fetchCandleSticks(request.query, response);
  }
});

function fetchCandleSticks({symbol, timeframe, since, limit, params}, response){

  exchanges.bitfinex.fetchOHLCV(symbol, timeframe, since, limit, params)
    .then( (data)=>{
    console.log('candlesticks?',data);
      response.json(
          {
            meta:{
              symbol,
              count:_.size(data),
              params:{symbol, since, limit, params}
            },
            data
          }
      );
  })
  .catch(err => {
    response.status(400).json(err);
  });
}
(/)
*/

function nice(i){
  return JSON.stringify(i, null, 2);
}
