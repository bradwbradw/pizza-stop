function TableRow(params, componentInfo) {
  var TableRow = this;
  var asset = params.asset;
  TableRow.asset = ko.observable(asset);
  TableRow.bar = ko.observable(TableRow.asset().name);
  TableRow.foo = ()=>{
    console.log(TableRow.asset().name);
    TableRow.bar("donkey legs");//TableRow.asset().name);
  }
  TableRow.wasConstructed = () => {
    return _.get(TableRow.asset(), 'wasConstructed', false);
  }

  _.extend(TableRow,
    {
      price: ko.computed(()=>{
        return `$${_.get(TableRow.asset(), 'price.usd')}`;
      }),
      refresh: ()=>{
        console.log('refresh '+TableRow.asset().symbol+'...');
        TableRow.asset().refresh();
        /*
        PS.geckoClient.asset(TableRow.asset.symbol)
          .then(r =>{
            console.log(r);
            TableRow.asset(r);
          })
          .catch(err =>{
            console.error(err);
          });
          */
      }
    }
  );

  return TableRow;
};

module.exports =  {
  createViewModel: TableRow
}

/*

_.set(result, 'platforms',
  _.map(
    _.keys(_.get(result, 'platforms',[])),
    (key) => {
      return {
        platform:key,
        address:result.platforms[key]
      };
    }
  )
);


*/
