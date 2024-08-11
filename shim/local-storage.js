
var localStorage;
import LocalStorage from 'node-localstorage';

try {
  window;
  localStorage = window.localStorage;
} catch (err){
  //localStorage = new require('node-localstorage').LocalStorage('./local-storage');
  localStorage = LocalStorage.LocalStorage('./local-storage');
}

export default localStorage;
