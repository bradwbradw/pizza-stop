
function SearchResult(params, componentInfo){
  var SearchResult = this;
  _.extend(SearchResult, params.asset);
  return SearchResult;
}

module.exports =  {
  createViewModel: SearchResult
}
