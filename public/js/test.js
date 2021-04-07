mocha.setup('bdd');
function hello(){
  return 'hello world';
}

describe('hello', function(){
  it('should say hello', function(){
    chai.expect(hello()).to.eql('hello world');
  });

  it('should bla', function(){

    var P = new Pizza();
    P.key('bla');
    chai.expect(P.key()).to.eql('bla');
  });

  it('should slice', function(){
    var S = new Slice(
      {
        currency:'BTC',
        quoteCurrency:'USDT',
        amount:0.01,
        boughtPrice:50000,
        nowPrice:60000
      });

      chai.expect(S.ticker()).to.eql('BTC-USDT');
  });
});

describe('p', function(){
})


mocha.run();
