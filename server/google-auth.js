var Auth = require('@googleapis/oauth2');
var _ = require('lodash');
/*
var {
  SecretManagerServiceClient
} = require('@google-cloud/secret-manager');
var secretManagerServiceClient = new SecretManagerServiceClient();
*/
var client = null;
function get() {
  var auth = new Auth.auth.GoogleAuth({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  })
  return auth.getClient()
    .then((c) => {
      client = c;
      return client;
    })
    .catch(err => {
      console.error(err);
      getting = null;
      return Promise.reject("error fetching google auth secrets");
    })
}

var getting;

module.exports = {
  get: () => {
    if (client) {
      return Promise.resolve(client);
    } else {
      if (!getting) {
        getting = get();
      }
      return getting;
    }
  }
}
