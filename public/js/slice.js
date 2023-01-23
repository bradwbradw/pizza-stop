
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
      trades: ko.observableArray([])
    });

    // math
    _.extend(Slice, {
      tradeCount: ko.computed(()=>{
        return _.size(Slice.trades());
      }),
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
        if (Slice.quoteCurrency() == getPizza().selectedQuoteCurrency()){
          return Slice.returnDiff();
        } else {
          var pair = `${Slice.quoteCurrency()}/${getPizza().selectedQuoteCurrency()}`;
          var quote2Price = getPizza().getLivePrices()[pair];

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
      return getPizza().fetchPrice(Slice)
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

      refresh: () =>{
        return new Promise((resolve, reject) => {

          ko.tasks.schedule(()=>{
            if (_.isString(getPizza().key()) && _.isString(_.first(getPizza().exchanges()))){
              var trades = [];
              Promise.all(_.map(getPizza().exchanges(), exchange => {
                return Api.user(getPizza().key()).trades(exchange, Slice.ticker())
                .then(t => {
                  trades = _.flatten([trades, t]);
                });
              }))
              .then(() => {
                console.log(trades);

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
                Slice.trades(trades);
                resolve(Slice.updateNowPrice());
              });
            } else {
              resolve(Slice.updateNowPrice());
            }

          });
        });
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

  function getPizza(){
    return window.Instances.Pizza;
  }
