//wip


function Asset(params) {
  var Asset = this;
  _.extend(Asset, params);
  _.extend(Asset, {
    refresh: () => {
      PS.geckoClient.asset(Asset.symbol)
        .then(r => {
          console.log(r.price.usd);
          _.extend(Asset, r);
        }).catch(err => {
          console.error(err);
        });
    },
    wasConstructed: true
  });
  return Asset;
}


function doSearch(query) {
  Api.asset(query)
    .then(result => {

      console.log(result);
      HomePage.searchResults([ko.observable(result)]);
    })
    .catch(response => {
      HomePage.searchResults([]);
      HomePage.status("none found");
    })

  Api.httpRequest(query)
    .then(result => {
      console.log('result', result);
      HomePage.result(result);
    })
  console.log("query is " + HomePage.query());
}