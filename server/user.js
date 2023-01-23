const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const moment = require('moment');
const ccxt = require ('ccxt');

module.exports = ({apiKey}) => {

  if (apiKey == process.env.SECRET){
    return Promise.resolve(user());
  } else {
    return Promise.reject({message:"key mismatch"});
  }

}
//console.log("brad kraken read:"+process.env.BRAD_KRAKEN_READ);
//console.log("brad kraken secret:"+process.env.BRAD_KRAKEN_SECRET);
function user(){
  return _.extend({},{

    exchangeKeys:{
      kraken:{
        apiKey: process.env.BRAD_KRAKEN_READ,
        secret: process.env.BRAD_KRAKEN_SECRET
      },
      binance:{
        apiKey: process.env.BRAD_BINANCE_READ,
        secret: process.env.BRAD_BINANCE_SECRET
      },
      kucoin:{
        apiKey: process.env.BRAD_KUCOIN_READ,
        secret: process.env.BRAD_KUCOIN_SECRET,
        password:process.env.BRAD_KUCOIN_PASSPHRASE
      },
      ftx:{
        apiKey: process.env.BRAD_FTX_READ,
        secret: process.env.BRAD_FTX_SECRET
      },
      okex:{
        apiKey: process.env.BRAD_OKEX_READ,
        secret: process.env.BRAD_OKEX_SECRET,
        password: process.env.BRAD_OKEX_PASSPHRASE
      }
    }
  });
}
