
var localStorage;

try {
  window;
  localStorage = window.localStorage;
} catch (err){
  localStorage = new require('node-localstorage').LocalStorage('./local-storage');
}

module.exports = localStorage;
