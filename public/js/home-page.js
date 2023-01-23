
function HomePage() {
  var HomePage = this;
  _.extend(HomePage,
    {
      query: ko.observable(),
      status: ko.observable("ready..."),
      result: ko.observable(""),
      chainInfo: (id) => {
        if (id) {

          return _.get(PS.chains, `${id}.name`, "unknown blockchain");
        }
        else {
          return PS.chains;
        }
      },
    });


  _.extend(HomePage,
    {

      resultString: ko.computed(() => {
        return JSON.stringify(HomePage.result(), null, 2);
      })
    });

  ko.computed(HomePage.query).subscribe(doSearch);

  function doSearch(query) {
    HomePage.status('fetching...');
    Api.httpRequest(query)
      .then(result => {
        HomePage.status('ready...');
        HomePage.result(result);

        console.log(HomePage.resultString());
      })
      .catch(err => {
        HomePage.status(err.message);
      })
  }


  HomePage.resultDescription = ko.observable("waiting for query...");
  return HomePage;
}
