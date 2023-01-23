
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

function loadObj(key, constructorFn ){

    var result = localStorage.getItem(key);
    if (_.isString(result)) {
      var obj;
      try {
        obj = JSON.parse(result);
      } catch (error) {
        console.error(error);
      }
      if (_.isObject(obj)){
        if (_.isFunction(constructorFn)){

          return _.mapValues(obj, constructorFn);

        } else {
          return obj;
        }
      } else {
        return {};
      }
    } else {
        return {};
    }
}

function persistandObservableArray(VM, name, itemConstructorFn){
  var o;
  if (_.isFunction(itemConstructorFn)){
    o = ko.observableArray(load(name, itemConstructorFn));
  } else {
    o = ko.observableArray(load(name));
    //    o = ko.observableArray(load(name), (x) =>{
    //  return ko.mapping.fromJS(x, {})
    ///});
  }

  o.subscribe(saveToLocalStorage(name, VM), VM, "arrayChange");
  return o;
}

function persistantObservable(VM, name){
  var o = ko.observable(load(name));
  o.extend({save:name});
  return o;
}
