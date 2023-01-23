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
    var S = new Slice(      {
        currency:'BTC',
        quoteCurrency:'USDT',
        amount:0.01,
        boughtPrice:50000,
        nowPrice:60000
      });

      chai.expect(S.ticker()).to.eql('BTC-USDT');
  });
});

describe('vault balances', function(){
  it('masterchef wftm wmemo', function(){
    return Api.contractBalance({
      chainID:250,
      contractAddress:"0xc7dad2e953Dc7b11474151134737A007049f576E",
      address:"0xaddress",
      lpTokenContract:"0x054ED3A0202baD05999F5F3887A84E1A8032e8F9",
      assets:"wftm wmemo"
    }).then(balances =>{
      console.log('got', balances);
      chai.expect(balances.wftm).to.eql(99);
    })
  });
})


mocha.run();
