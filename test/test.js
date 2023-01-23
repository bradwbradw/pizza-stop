let _ = require('lodash');
let assert = require('assert');
let fs = require('fs');
const path = require('path');
let proxyquire = require('proxyquire');
let sinon = require('sinon');
const { doesNotMatch } = require('assert');
const { asset } = require('../module/gecko-client.js');

describe('classify', function() {

  //    var createPresetStub = sinon.stub().resolves({success:true});
  var readMethodFixtures = {};//require('./fixtures/read-methods.js');
  
  
  
  // does not work
  /*
  var contractClassify = proxyquire('../server/contract-classify.js', {
      './web3-client.js':{
        getContractReadMethods:(chainID, contractAddress) => {
          //console.log('fixture for ',contractAddress);
          var list = _.get(readMethodFixtures, contractAddress);
          //console.log('is',list);
          return Promise.resolve(list);
        },
      }
    });

  */

  function identifyTest(contractAddress, expectedType){
    return contractClassify({chainID:'123', contractAddress})
      .then(type => {
//        console.log('type', type);
        assert.equal(type, expectedType);
      });
    }

  xit('should identify tomb masterchef', function() {
      return identifyTest('0xmasterchef-tshare-wftm', 'masterchef');
  });

  xit('should identify brush masterchef', function(){
    return identifyTest('0xmasterchef-brush', 'masterchef');
  });

  xit('should identify ice-wftm masterchef', function(){
      return identifyTest('0xmasterchef-devil-ice-wftm', 'masterchef');
  });

  xit('should identify pills syrup', function(){
      return identifyTest('0xsyrup-pills', 'syrup');
  });

  xit('should identify beefy vault', function(){
    return identifyTest('0xbeefy-vault', 'beefyVault');
  });

  xit('should identify beets masterchef', function(){
    return identifyTest('0xbeets-masterchef', 'beets-masterchef');
  });

});

describe('balance', function(){

  var balance;
  var address = process.env.BRAD_T;
  it('should load balance lib', function(){
    balance = require('../server/balance.js');
    assert.ok(balance);
  });

  it('should load eth balance from ethereum', function(){

    var o = 
      {
        tickers:['eth'],
        address
      };

    return balance.get(o)
      .then(result => {
        console.log("2222222222");
        console.log(result.balances);
        assert.ok(result);
        assert.ok(result.balances);
        done();
      }).catch(err => {
        assert.fail(err.message);
        done();
      });
  });

  it('should load asset balance from cex', function(){
    return 'unimplemented';
  });

})
