
// use for observableArrays
function saveToLocalStorage(key, viewModel) {
  return function() {
//    console.log('saved', key);
    var observable = _.get(viewModel, key);
    if (_.isFunction(observable)) {
      var value = observable();
      localStorage.setItem(key, ko.toJSON(viewModel[key]()));
    } else {
      console.log("observable is not a function for key " + key);
    }
  };
}




function isNum(input) {
  return _.isNumber(input) && !_.isNaN(input);
}

function nice(input){
  return JSON.stringify(input, null, 2);
}

  function load(key, constructorFn) {
    var result = localStorage.getItem(key);
    if (_.isString(result)) {
      var arr;
      try {
        arr = JSON.parse(result);
        if (_.isFunction(constructorFn)) {
          return _.map(arr, constructorFn);
        } else {
          return arr;
        }
      } catch (error) {
        console.error(error);
      }
    } else {
      console.log("localstorage key " + key + " is empty");
        return [];
    }
  }