
console.log("welcome to pizza stop :o");
if (!ko || !_ || !moment || !CURRENCIES || !QUOTE_2_CURRENCIES) {
  console.error("dependencies failed:", ko, _, moment, CURRENCIES, QUOTE_2_CURRENCIES);

  var ko = {};
  var _ = {};
  var moment = {};
  var CURRENCIES = "";
  var QUOTE_2_CURRENCIES = "";
debugger;
}

if (!_.isFunction(httpRequest) || !_.isFunction(saveToLocalStorage) || !_.isFunction(isNum) || !_.isFunction(load)){
  var httpRequest = ()=>{};
  var saveToLocalStorage = ()=>{};
  var isNum = ()=>{};
  var load = () => {};
  //console.error('function dependencies failed');
  alert('function dependencies failed');
  debugger;
} else {

//ko.options.deferUpdates = true;
//$(document).ready(function() {
  ko.applyBindings(new Pizza());
//});

}

function Pizza() {

  var DATE_FORMAT = "dddd, MMMM Do YYYY, h:mm:ss a";
  var RATE = 5000;
  var digits = 8;
  var sortings = {
    alpha:(Slice) => {
        return Slice.ticker();
      },
    percent:(Slice) => {
        var p = Slice.returnProportion();
        if (_.isNumber(p)){
          return -1*p;
        } else {
          return 99999;
        }
      },
    "net gain":(Slice) => {
        var p = Slice.quote2Value();
        if (_.isNumber(p)){
          return -1*p;
        } else {
          return 99999;
        }
      }
  }

  var Pizza = this;
    _.extend(Pizza, {
    status: ko.observable(),
    error: ko.observable(),
    availableCurrencies: ko.observableArray(CURRENCIES),
    availableQuoteCurrencies: ko.observableArray(QUOTE_2_CURRENCIES),
    availableExchanges: ko.observableArray(EXCHANGES),
    exchanges: ko.observableArray(load("exchanges")),
    newExchange: ko.observable(),
    selectedQuoteCurrency: ko.observable("USDT"),
    newSliceCurrency: ko.observable(),
    newSliceQuoteCurrency: ko.observable("USDT"),
    newSliceAmount: ko.observable(),
    newSliceTransactionDate: ko.observable(),
    newSliceBoughtPrice: ko.observable(),
    newSliceFetchingPrice: ko.observable(false),
    autoRefresh: ko.observable(false),
    livePrices: ko.observable({}),
    availableSortings: ko.observable(_.keys(sortings)),
    selectedSorting: ko.observable("net gain"),
    key: ko.observable(load('key')),
    assets: ko.observableArray(load('assets')),
    quoteCurrencies: ko.observableArray(load('quoteCurrencies')),
    newAsset: ko.observable(),
    newQuoteCurrency: ko.observable(),
    trades: ko.observable(loadObj('trades'))
  });
  _.extend(Pizza,{
    assetsFormatted: ko.computed(()=>{
      return Pizza.assets().join(', ');
    }),
    quoteCurrenciesFormatted: ko.computed(()=>{
      return Pizza.quoteCurrencies().join(', ');
    }),
    exchangesFormatted: ko.computed(() => {
      return Pizza.exchanges().join(', ');
    }),
    addNewAsset: () => {
      Pizza.assets.push(Pizza.newAsset());

    },
    addNewQuoteCurrency: () => {
      Pizza.quoteCurrencies.push(Pizza.newQuoteCurrency());
    },
    addNewExchange:() => {
      Pizza.exchanges.push(Pizza.newExchange());
    }
  });
  var saving = 'livePrices key exchangeSlices trades'.split(' ');

  var saveArrays = "slices assets quoteCurrencies exchanges".split(' ');

  Pizza.getLivePrices = ko.computed(function() { return Pizza.livePrices();});
  Pizza.newSliceGetPrice = () =>{
            Pizza.status("fetching...");
            Pizza.newSliceFetchingPrice(true);
            var date = new moment(Pizza.newSliceTransactionDate());
            if (moment.isMoment(date)){

            var params = {
              currency: Pizza.newSliceCurrency(),
              quoteCurrency: Pizza.newSliceQuoteCurrency(),
              beginDate: moment(date).subtract(3,"minutes"),
              endDate: moment(date).add(3, "minutes"),
              tradesPerMinute: 2
            };
            httpRequest("/price-data", params, {})
              .then(response => {
                Pizza.status("");
                return _.map(_.get(response, "prices"), t => {
                  console.log("trade", t);
                  return t.price;
                });
              })
              .then(prices => {
                var num = _.size(prices);
                var mean = null
                if (isNum(num) && num > 0){
                  var sum = _.sumBy(prices);
                  mean = sum/num;
                }

                if (isNum(mean)){
                  Pizza.newSliceBoughtPrice(mean);
                }
                Pizza.status(`${_.size(prices)} prices found`);
                Pizza.newSliceFetchingPrice(false);
              })
              .catch(err => {
                Pizza.newSliceFetchingPrice(false);
                Pizza.error(err);
              });
            } else {
              console.log("not a date:", date);
            }
  }

function Slice({currency, quoteCurrency, amount, transactionDate, boughtPrice, nowPrice}) {
    var Slice = this;
    _.extend(Slice, {
      currency: ko.observable(currency),
      quoteCurrency: ko.observable(quoteCurrency),
      amount: ko.observable(amount),
      transactionDate: ko.observable(transactionDate),
      boughtPrice: ko.observable(boughtPrice),
      nowPrice: ko.observable(nowPrice),
      error:ko.observable(""),
      status:ko.observable("ready"),
      updated: ko.observable(),
    });

    // math
    _.extend(Slice, {
      ticker: ko.computed(() => {
          return Slice.currency()+'/'+Slice.quoteCurrency();
      }),
      returnProportion: ko.computed(()=>{
        var now = Slice.nowPrice();
        var then = Slice.boughtPrice();
        if (now == 0){
          return null;
        } else if (_.isNumber(now) && _.isNumber(then)){
          return (now - then) / then;
        } else {
          return null;
        }
      })
    });

    // math 2
    _.extend(Slice, {
      trades: ()=>{
        return Pizza.trades()[Slice.ticker()];
      },
      minusLineLength: ko.computed(() => {
        var r = Slice.returnProportion();
        if ( !r || r >= 0 ){
          return 0;
        } else {
          return `${r*100}%`;
        }
      }),
      plusLineLength: ko.computed(() => {
        var r = Slice.returnProportion();
        if ( !r || r <= 0 ){
          return 0;
        } else {
          return `${r*100}%`;
        }

      })
    });

    // formatting
    _.extend(Slice, {
      tradesCount: ko.computed(()=>{
        return _.size(Slice.trades());
      }),
      totalReturnValue: ko.computed(() => {
        var result = Slice.amount() * Slice.nowPrice();
        if (isNum(result)) {
          return result;//_.round(result, digits);
        } else {
          return null;
        }
      }),
      initialValue: ko.computed(() => {
        var result = Slice.amount() * Slice.boughtPrice();
        if (isNum(result)) {
          return result;//_.round(result, digits);
        } else {
          return "...";
        }
      })

    });

    Slice.returnDiff = ko.computed(() => {
      var initial = Slice.initialValue();
      var now = Slice.totalReturnValue();
      if (isNum(initial) && isNum(now)) {
        var d = now - initial;
        return d;

      } else {
        return null;
      }
    });

    _.extend(Slice, {
      percentReturn: ko.computed(() => {
        var result =
          (100 * Slice.nowPrice()) / Slice.boughtPrice() - 100;
        if (isNum(result)) {
          var sign = result >= 0? '+' : '-';
          return `${sign}%${_.round(Math.abs(result), 2)}`;
        } else {
          return "...";
        }
      }),
      totalReturnValueFormatted: ko.computed(() => {
        var v = Slice.totalReturnValue();
        if(_.isNumber(v)){
          return `${_.round(v, 7)} ${Slice.quoteCurrency()}`;
        } else {
          return "...";
        }
      }),
      returnDiffFormatted: ko.computed(() => {
        var d = Slice.returnDiff();
        var sign = d > 0 ? '+' : '-';
        if(_.isNumber(d)){
          return `${sign}${_.round(Math.abs(d), 6)}`;
        } else {
          return "...";
        }
      })
    })


    Slice.quote2Value = ko.computed(() => {
        if (Slice.quoteCurrency() == Pizza.selectedQuoteCurrency()){
          return Slice.returnDiff();
        } else {
          var pair = `${Slice.quoteCurrency()}/${Pizza.selectedQuoteCurrency()}`;
          var quote2Price = Pizza.getLivePrices()[pair];

          if (isNum(quote2Price) && isNum(Slice.returnDiff())){
            return quote2Price * Slice.returnDiff();
          } else {
              //Slice.status(`sorry, ${Slice.quoteCurrency()} value is not yet available`);
              return null;
          }
        }
    });

    Slice.quote2ValueFormatted = ko.computed(()=>{
      var v = Slice.quote2Value();
      if (isNum(v)){
        return _.round(v, 2);
      } else {
        return "...";
      }
    });

    Slice.updateNowPrice = () => {
      return Pizza.fetchPrice(Slice)
      .then(p => {
        Slice.status("");
        Slice.updated(new moment().format(DATE_FORMAT));
        Slice.nowPrice(p);
        return Slice;
      })
      .catch(err => {
        console.log(err);
        Slice.error(err);
        Slice.status("");
      });
    }
    _.extend(Slice, {
      loadTrades:() => {
        return new Promise((resolve, reject) => {

          ko.tasks.schedule(()=>{
            if (_.isString(Pizza.key()) && _.isString(_.first(Pizza.exchanges()))){
              Promise.all(_.map(Pizza.exchanges(), exchange => {
                return api.user(Pizza.key()).trades(exchange, Slice.ticker())
              }))
              .then((tArray) => {
                var trades = _.flatten(tArray);
                Pizza.trades(_.extend(Pizza.trades(), _.set({},Slice.ticker(),trades)));//[Slice.ticker()]trades);
                resolve(Slice);
              });
            } else {
              resolve(Slice);
            }

          });
        });
      },
      updateValue:()=>{
        console.log(`got ${_.size(trades)} ${Slice.ticker()} trades`);
        if (Slice.tradesCount() > 0){
          var trades = Slice.trades();
          var buyCount = 0;
          var buySum = _.sumBy(_.filter(trades,{side:"buy"}), (trade) => {
              //console.log(`summing ${trade.amount} at ${trade.price}`);
              buyCount = buyCount + trade.amount;
              return trade.amount * trade.price;
            });
          var netCount = 0;
          var netSum = _.sumBy(trades, (trade) => {
              if (trade.side == "buy"){
                //console.log(`bought ${trade.amount} ${trade.symbol? trade.symbol : "[?]"} at ${trade.price}`);
                netCount = netCount + trade.amount;
                return trade.amount * trade.price;
              } else if (trade.side == "sell"){

                //console.log(`adding sell ${trade.amount} at ${trade.price}`);
                netCount = netCount - trade.amount;
                return (-1)*trade.amount *trade.price;

              }
            });
          Slice.amount(netCount);
          Slice.boughtPrice(buySum/buyCount);
          return Slice.updateNowPrice();
        } else {
          return Slice.updateNowPrice();
        }
      }
    })


    ko.computed(() => {
      var v = ko.toJS(Slice);
      return v;
    }).subscribe(() => {
      saveToLocalStorage("slices", Pizza)();
    })
    return Slice;
  };

  function sliceConstructor (item){
    var numericKeys = "amount boughtPrice initialValue nowPrice returnDiff totalReturnValue".split(' ');
    _.each(numericKeys, k => {
      if (_.isString(_.get(item, k))){
        var n;
        try {
          n = parseFloat(item[k]);
        } catch (err){

        }
        if(_.isNumber(n)){
          _.set(item, k, n);
        }
      }
    })
    return new Slice(item);
  }

  _.extend(Pizza, {
    slices: ko.observableArray(
      load("slices", sliceConstructor)
    ),
    exchangeSlices:ko.observable(loadObj('exchangeSlices', sliceConstructor))
  });
  _.extend(Pizza,{
    exchangeSlicesJson:ko.computed(()=>{
      var result = '...';
      try {
        result = JSON.stringify(ko.toJS(Pizza.exchangeSlices()), null, 2);
      } catch (err){

      }
      return result;
    }),
    slicesSorted: ko.computed(function() {
      var slices = Pizza.slices();
      var sort = Pizza.selectedSorting();
      var sortFn = _.get(sortings, sort);
      if (_.isFunction(sortFn)){

        return _.sortBy(slices, sortFn);

      } else {
        console.error($`not a function: sortings.{sort}`);
      }
    }),
    exchangeSlicesArray: ko.computed(()=>{
      return _.values(ko.toJS(Pizza.exchangeSlices()));
    })
  });

  _.each(saving, s =>{
    Pizza[s].extend({save:s});
  })

  _.each(saveArrays, s =>{
    Pizza[s].subscribe(saveToLocalStorage(s, Pizza), Pizza, "arrayChange");
  })
  Pizza.addSlice = () => {
    if (
//      Pizza.newSliceAmount() &&
      Pizza.newSliceCurrency() &&
      Pizza.newSliceQuoteCurrency()
  //    Pizza.newSliceBoughtPrice()
    ) {
      Pizza.slices.push(
        new Slice({
          currency: Pizza.newSliceCurrency(),
          quoteCurrency: Pizza.newSliceQuoteCurrency(),
          amount: Pizza.newSliceAmount(),
          transactionDate: Pizza.newSliceTransactionDate(),
          boughtPrice: Pizza.newSliceBoughtPrice()
        })
      );

      Pizza.newSliceAmount(null);
      Pizza.newSliceCurrency(null);
      Pizza.newSliceQuoteCurrency('BTC');
      Pizza.newSliceBoughtPrice(null);
    } else {
      Pizza.status("please fill in all fields to add one");
    }
  };
  //  Pizza.wallets.extend({ rateLimit: 50 });
  Pizza.removeSlice = function() {
    console.log("remove", this);
    Pizza.slices.remove(this);
  }

  Pizza.btcCadValue = ko.computed(() => {return _.get(Pizza.livePrices(), 'BTC/CAD')});
  Pizza.btcEthValue = ko.computed(() => {return _.get(Pizza.livePrices(), 'BTC/ETH')});

  Pizza.fetchPrice = item => {
    item.status("fetching...");
    item.error("");
    var symbol = `${item.currency()}/${item.quoteCurrency()}`;


    return fetchTicker(symbol)
    .then(result => result.close)
    .catch(err => {
      if (_.get(err, 'name')  == "BadSymbol"){
        return fetchTicker(`${item.currency()}/USD`)
        .then(result => result.close)
        .then(p => {
          var usdPrice = p;
          return fetchTicker(`${item.quoteCurrency()}/USD`)
          .then(result => result.close)
          .then(p =>{
            console.log(`${item.currency()}: btc/usd: ${usdPrice}. btc:${p}`);
            return usdPrice/p;
          })
        })
      } else {

        console.error(err);
        item.error(err);
      }
    });
  };

  // refactor above into extend syntax
  _.extend(Pizza, {
    refresh: () => {

      var k = Pizza.key();
      if (_.isString(k)){

        // find and create any new exchange slices

        _.each(Pizza.assets(), asset => {
          _.each(Pizza.quoteCurrencies(), qc => {
            var pair = `${asset}/${qc}`;
            var slice = Pizza.exchangeSlices()[pair];
            if (slice){
            } else {
              Pizza.exchangeSlices(_.extend(Pizza.exchangeSlices(),_.set({},pair,
                new Slice(
                  {
                    currency:asset,
                    quoteCurrency: qc
                  })
              )));
            }
          });
        });

      }
      _.each(Pizza.slices(), slice => {
        console.log('refreshing from slices()', slice);
        slice.updateValue();
    //    pairs.push(slice.ticker());
      });

      _.each(Pizza.exchangeSlices(), slice => {
        if (slice.tradesCount() == 0){
          slice.loadTrades()
          .then(() => {
            slice.updateValue();
          });
        } else {
          slice.updateValue();
        }
      })



    },
    refreshLivePrices: () => {
      var quoteCurrenciesFromSlices = [];
      _.each(_.flatten([Pizza.slices(),Pizza.exchangeSlicesArray()]), s => {
        quoteCurrenciesFromSlices = _.union(quoteCurrenciesFromSlices, [sliceConstructor(s).quoteCurrency()]);
      });
      console.log("qcfs",quoteCurrenciesFromSlices);
      _.each(quoteCurrenciesFromSlices, symbol => {
        if (symbol !== Pizza.selectedQuoteCurrency()){
          Pizza.scheduleTickerFetch(symbol, Pizza.selectedQuoteCurrency());
        }
      });
      console.log(quoteCurrenciesFromSlices);
    },

    scheduleTickerFetch: function (currency, quoteCurrency){
        var pair = `${currency}/${quoteCurrency}`;
        ko.tasks.schedule(() => {
            console.log('fetch ticker ',pair);
            fetchTicker(pair)
              .then(result => result.close)
              .then(result => {
                console.log('ticker result ', result);
                Pizza.livePrices(_.extend(Pizza.livePrices(), _.set({},pair,result)));

                console.log('now live prices is', Pizza.livePrices());
              }).catch(err =>{
                console.log(err);
              });
        });
      },
    grandTotalReturn: ko.computed(() => {
      var sum = _.sumBy(Pizza.slices(), item => {

        return item.quote2Value();
      });

      return _.round(sum, 2);
    })
  });
/*
  setInterval(() => {
    if (Pizza.autoRefresh()){
      Pizza.refresh();
      console.log('auto refresh...');
    } else {
      console.log('autorefresh is ', Pizza.autoRefresh());
    }
  }, RATE);*/

//  Pizza.refresh();
  Pizza.refreshLivePrices();

  function fetchTicker(pair){
    return httpRequest('ccxt/exchanges/fetchTicker', {methodParams:[pair]})
    .catch((err) => {
      throw new Error(`${pair} fetch ticker failed`);
    })
  }
}
