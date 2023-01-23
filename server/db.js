
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const sqlite3 = require("sqlite3").verbose();
const sanitizeFilename = require('sanitize-filename');
const sanitize = (input) => {
  return sanitizeFilename(_.trim(input));
};
// init sqlite db

// one sqlite db per coin pair.
// snippet to delete on boot:
//fs.unlinkSync('./.data/prices-ETH-BTC.db')

module.exports = function dbHelper({ currency, quoteCurrency }) {
  currency = sanitize(currency);
  quoteCurrency = sanitize(quoteCurrency);
  console.log('db');
  const dbFile = `./.data/prices-${currency}-${quoteCurrency}.db`;
  var name = `${currency}_${quoteCurrency}`;
  var db;

  function table() {

    return new Promise((resolve, reject) => {
      const exists = fs.existsSync(dbFile);

      if (!exists) {
        console.log('db file is ' + dbFile);
        var db = new sqlite3.Database(dbFile, (err => {
          if (err) {
            reject(err);
          } else {

            db.run(
              `CREATE TABLE ${name} (
                  millis INTEGER PRIMARY KEY UNIQUE,
                  price REAL)`,
              {},
              function (e) {
                if (e) {
                  reject(e);
                  // rollback here
                } else {
                  console.log(`New table ${name} created!`);
                  resolve(db);
                }
              }
            );
          }
        }));

      } else {
        var db = new sqlite3.Database(dbFile, (err => {
          if (err) {
            console.error(err);
            reject(err);
          } else {
            console.log(`Database "${name}" ready to go!`);
            resolve(db);
          }

        }));
      }
    })
  }

  function upsert(priceArray) {
    if (!_.isArray(priceArray)) {
      return Promise.reject('upsert expects an array [{millis:123, price:1.23}]');
    }
    //    console.log('upsert', priceArray);
    return Promise.all(_.map(priceArray, p => {
      return get(p.millis)
        .then(result => {
          if (result) {
            //    console.log(`updating ${p.millis} ${p.price}`);
            return update(p.millis, p.price);
          } else {
            //     console.log(`inserting ${p.millis} ${p.price}`);
            return insert(p.millis, p.price);
          }
        });
    })).then(arr => {
      //    console.log('upsert returns first of:', arr);
      return _.first(arr);
    });
  }

  function insert(millis, price) {
    //    const cleanPrice = cleanseString(price);
    return new Promise((resolve, reject) => {

      db.run(
        `INSERT INTO ${name} (millis, price) VALUES ($millis, $price)`,
        {
          $millis: millis,
          $price: price
        },
        error => {
          if (error) {
            reject(error);
          } else {
            resolve({ millis, price });
          }
        });
    });
  }

  function update(millis, price) {
    return new Promise((resolve, reject) => {
      db.run(`UPDATE ${name} SET
        price = $price
        WHERE millis = $millis`,
        {
          $price: price,
          $millis: millis
        }, error => {
          if (error) {
            reject(error);
          } else {
            resolve({ millis, price });
          }
        });
    });
  }

  function get(millis) {
    return new Promise((resolve, reject) => {

      db.get(`SELECT * from ${name} WHERE millis = ?`,
        [millis],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            //     console.log(`db.get:`, JSON.stringify(row, null, 2));
            resolve(row);
          }
        });
    });
  }

  function getRange(minMillis, maxMillis) {
    return new Promise((resolve, reject) => {
      var q = `SELECT * from ${name} WHERE (millis >= $minMillis) AND (millis <= $maxMillis)`;
      //     console.log(q);
      db.all(q,
        {
          $name: name,
          $minMillis: minMillis,
          $maxMillis: maxMillis
        }
        , (err, rows) => {
          if (err) {
            console.error('range err', err);
            reject(err);
          } else {
            //       console.log('range', rows);
            resolve(rows);
          }
        });
    });
  }

  return table()
    .then((dbResult) => {
      db = dbResult;
      return {
        upsert,
        insert,
        update,
        get,
        getRange,
        currency,
        quoteCurrency
      };
    })
    .catch(err => {
      console.error(err);
      return Promise.reject(err);
    });
}

// helper function that prevents html/css/script malice
const cleanseString = function (string) {
  return string.replace(/</g, "&lt;").replace(/>/g, "&gt;");
};
