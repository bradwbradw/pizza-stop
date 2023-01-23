var {
  google
} = require('@googleapis/sheets');
var _ = require('lodash');
var googleAuth = require('./google-auth.js');

var pricesSheetID = process.env.PRICES_SHEET_ID;//'';//hotdog

var sheets;

function getSheets() {

  return new Promise(async (resolve, reject) => {
    debugger;
    if (sheets && sheets.spreadsheets) {
      resolve(sheets);
    } else {
      googleAuth.get()
        .then(auth => {
          sheets = google.sheets({
            version: 'v4',
            auth
          });
          resolve(sheets);
        })
        .catch(err => {
          console.error("can't get sheets");
          reject(err);
        });
    }
  })
}

function read(id, range) {
  return getSheets()
    .then(() => {
      return sheets.spreadsheets.values.get({
        spreadsheetId: id,
        range
      })
        .then(result => {

          //        console.log('got result from reading '+id);
          //          console.log(JSON.stringify(result, null, 2));
          var data = _.get(result, 'data.values');
          if (_.isArray(data)) {
            return data;
          } else {
            return Promise.reject(`unable to get data from google sheet id=${id} range=${ramge}`);
          }

        })


    })
}

function write(spreadsheetId, range, values) {
  return getSheets()
    .then(() => {
      return sheets.spreadsheets.values.update({
        valueInputOption: 'USER_ENTERED',
        spreadsheetId,
        range,
        resource: {
          values
        }
      });
    });
}

function printPrices(pricesMap) {
  read(pricesSheetID, 'portfolio')
    .then(p => {
      var lowerCased = _.map(p, pair => [_.toLower(pair[0], pair[1])]);
      var existingMap = _.fromPairs(lowerCased);
      _.each(_.keys(existingMap), t => {
        if (_.isNumber(_.get(pricesMap, _.toLower(t)))) {
          _.set(existingMap, t, pricesMap[_.toLower(t)]);
        }
      })
      return write(pricesSheetID, 'portfolio', _.toPairs(existingMap));
    });
}

function sheetTickers() {
  return read(pricesSheetID, 'portfolio')
    .then(t => {
      return _.keys((_.fromPairs(t)));
    })
}


module.exports = {
  printPrices,
  sheetTickers
};
