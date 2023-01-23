if (!__dirname && !!alert){
  alert("this is Tabley")
}
console.log("i am tableroonieo");


function Table(params, componentInfo) {
  var PsTable = this;

  function refresh(){
    console.log('refreshing the table');
  }
  PsTable = {
    refresh
  }
  PsTable.status = 'loading...'
  PsTable.assets = params.assets;
  return PsTable;
}

module.exports =  {
  createViewModel: Table
}
