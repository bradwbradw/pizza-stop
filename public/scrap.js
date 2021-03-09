


const Wallet = function({ address, currency }) {
  var Wallet = this;
  Wallet.address = ko.observable(address);
  Wallet.currency = ko.observable(currency);
  Wallet.addressTruncated = ko.computed(function() {
    var firstWord = Wallet.address().substring(0, 4);
    var length = _.size(Wallet.address());
    var secondWord = Wallet.address().substring(length - 4, length);
    return firstWord + "..." + secondWord;
  });
};
const Trade = function({ price, amount, side, time }) {
  var Trade = this;
  Trade.price = ko.observable(price);
  Trade.amount = ko.observable(amount);
  Trade.side = ko.observable(side);
  Trade.time = ko.observable(
    moment(time).format(DATE_FORMAT)
  );
  return Trade;
};




function exploreExchanges() {
  _.each(ccxt.exchanges, x => {
    var X = new ccxt[x]();
    if (X.hasCORS) {
      console.log(`exchange ${x} has cors? ${X.hasCORS}`);
      //console.log((new ccxt[x]()).hasCORS);
      if (X.hasFetchCurrencies) {
        X.fetchCurrencies().then(c => {
          console.log(`${x}: ${_.keys(c)}`);
        });
      } else {
        console.log(`${x} has no fetchCurrencies`);
      }
    } else {
      //console.log(`${x} has no CORS`);
    }
  });
}
