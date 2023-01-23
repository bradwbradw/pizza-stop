
function Transaction(params, componentInfo){
  var Transaction = this;
  _.extend(Transaction, params.data);
  Transaction.date = _.get(params.data, 'timeStamp');
  return Transaction;
}

exports =  {
  createViewModel: Transaction
}
