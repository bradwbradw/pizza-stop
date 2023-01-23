
var _ = require('lodash');
var moment = require('moment');
const SwaggerClient = require('swagger-client');
var crypto = require('crypto');

var api;

var rateLimited = false;
var accountIDs;
function setup(d){

    var key = process.env.BRAD_3COMMAS_KEY;
    var secret = process.env.BRAD_3COMMAS_SECRET;
    var apiDomain;
    if (_.isString(key) && _.isString(secret)){

      api = SwaggerClient(`http://${d}/3commas-swagger.json`,{
        requestInterceptor: req => {
          if (rateLimited){
            throw new Error('rate limited');
          } else {

            req.headers['APIKEY'] = key;
            if (_.isString(apiDomain)){
              var parts = _.split(req.url, apiDomain);
              var path = _.last(parts) + _.get(req, 'body','');
              var sig = crypto.createHmac('sha256', secret).update(path).digest('hex');
              req.headers['Signature'] = sig;
            }
            return req;
          }
        },
      responseInterceptor: res => {
        if (res.status == 429){
          rateLimited = true;
          console.log("** rate limited ** clear queue");
        } else if (res.status == 418){
          rateLimited = true;
          console.log("we are banned");
        }
      }});

      return api.then((m)=>{
        console.log("3commas api ready");
        apiDomain = _.get(m, 'spec.host');
//        console.log(m.spec.basePath);
        return m.apis.accounts.getVer1Accounts()
        .then(accounts => {
          accountIDs = _.map(_.filter(accounts.body, a => {
            var balance = _.toNumber(a.usd_amount);
            return balance > 50;
          }), 'id');
          //console.log({accounts:accounts.body, accountIDs});
        })
        .catch(err => {
          console.error(err);
        })
      }).catch(err =>{
        console.log("3commas api error "+err);
      });
    } else {
      console.log("cannot setup 3commas");
    }

}

function balance(){
  return api.then(t => {
    return t.apis.accounts.getVer1AccountsAccountIdNetworksInfo({
      account_id:_.last(accountIDs)})
    /*return t.apis.accounts.getVer1AccountsAccountIdBalanceChartData(
      {
        account_id:_.first(accountIDs),
        date_from: new moment().subtract(4,'weeks')
      })*/
  })
}
module.exports ={
  setup,
  balance
}


/*
apis: {
  bots: {
    getVer1BotsStrategyList: [Function (anonymous)],
    getVer1BotsPairsBlackList: [Function (anonymous)],
    postVer1BotsUpdatePairsBlackList: [Function (anonymous)],
    postVer1BotsCreateBot: [Function (anonymous)],
    getVer1Bots: [Function (anonymous)],
    getVer1BotsStats: [Function (anonymous)],
    postVer1BotsBotIdCopyAndCreate: [Function (anonymous)],
    patchVer1BotsBotIdUpdate: [Function (anonymous)],
    postVer1BotsBotIdDisable: [Function (anonymous)],
    postVer1BotsBotIdEnable: [Function (anonymous)],
    postVer1BotsBotIdStartNewDeal: [Function (anonymous)],
    postVer1BotsBotIdDelete: [Function (anonymous)],
    postVer1BotsBotIdPanicSellAllDeals: [Function (anonymous)],
    postVer1BotsBotIdCancelAllDeals: [Function (anonymous)],
    getVer1BotsBotIdDealsStats: [Function (anonymous)],
    getVer1BotsBotIdShow: [Function (anonymous)]
  },
  deals: {
    getVer1Deals: [Function (anonymous)],
    postVer1DealsDealIdConvertToSmartTrade: [Function (anonymous)],
    postVer1DealsDealIdUpdateMaxSafetyOrders: [Function (anonymous)],
    postVer1DealsDealIdPanicSell: [Function (anonymous)],
    postVer1DealsDealIdCancel: [Function (anonymous)],
    patchVer1DealsDealIdUpdateDeal: [Function (anonymous)],
    postVer1DealsDealIdUpdateTp: [Function (anonymous)],
    getVer1DealsDealIdShow: [Function (anonymous)],
    postVer1DealsDealIdCancelOrder: [Function (anonymous)],
    getVer1DealsDealIdMarketOrders: [Function (anonymous)],
    postVer1DealsDealIdAddFunds: [Function (anonymous)],
    getVer1DealsDealIdDataForAddingFunds: [Function (anonymous)]
  },
  users: {
    getVer1UsersCurrentMode: [Function (anonymous)],
    postVer1UsersChangeMode: [Function (anonymous)]
  },
  accounts: {
    postVer1AccountsTransfer: [Function (anonymous)],
    getVer1AccountsTransferHistory: [Function (anonymous)],
    getVer1AccountsTransferData: [Function (anonymous)],
    postVer1AccountsNew: [Function (anonymous)],
    postVer1AccountsUpdate: [Function (anonymous)],
    getVer1Accounts: [Function (anonymous)],
    getVer1AccountsMarketList: [Function (anonymous)],
    getVer1AccountsMarketPairs: [Function (anonymous)],
    getVer1AccountsCurrencyRatesWithLeverageData: [Function (anonymous)],
    getVer1AccountsCurrencyRates: [Function (anonymous)],
    getVer1AccountsAccountIdDepositData: [Function (anonymous)],
    getVer1AccountsAccountIdNetworksInfo: [Function (anonymous)],
    postVer1AccountsAccountIdConvertDustToBnb: [Function (anonymous)],
    getVer1AccountsAccountIdActiveTradingEntities: [Function (anonymous)],
    postVer1AccountsAccountIdSellAllToUsd: [Function (anonymous)],
    postVer1AccountsAccountIdSellAllToBtc: [Function (anonymous)],
    getVer1AccountsAccountIdBalanceChartData: [Function (anonymous)],
    postVer1AccountsAccountIdLoadBalances: [Function (anonymous)],
    postVer1AccountsAccountIdRename: [Function (anonymous)],
    postVer1AccountsAccountIdPieChartData: [Function (anonymous)],
    postVer1AccountsAccountIdAccountTableData: [Function (anonymous)],
    postVer1AccountsAccountIdRemove: [Function (anonymous)],
    getVer1AccountsAccountIdLeverageData: [Function (anonymous)],
    getVer1AccountsAccountId: [Function (anonymous)]
  },
  smart_trades: {
    postVer1SmartTradesCreateSimpleSell: [Function (anonymous)],
    postVer1SmartTradesCreateSimpleBuy: [Function (anonymous)],
    postVer1SmartTradesCreateSmartSell: [Function (anonymous)],
    postVer1SmartTradesCreateSmartCover: [Function (anonymous)],
    postVer1SmartTradesCreateSmartTrade: [Function (anonymous)],
    getVer1SmartTrades: [Function (anonymous)],
    postVer1SmartTradesSmartTradeIdCancelOrder: [Function (anonymous)],
    postVer1SmartTradesSmartTradeIdAddFunds: [Function (anonymous)],
    postVer1SmartTradesSmartTradeIdStepPanicSell: [Function (anonymous)],
    patchVer1SmartTradesSmartTradeIdUpdate: [Function (anonymous)],
    postVer1SmartTradesSmartTradeIdCancel: [Function (anonymous)],
    postVer1SmartTradesSmartTradeIdPanicSell: [Function (anonymous)],
    postVer1SmartTradesSmartTradeIdForceStart: [Function (anonymous)],
    postVer1SmartTradesSmartTradeIdForceProcess: [Function (anonymous)],
    getVer1SmartTradesSmartTradeIdShow: [Function (anonymous)]
  },
  marketplace: {
    getVer1MarketplacePresets: [Function (anonymous)],
    getVer1MarketplaceItems: [Function (anonymous)],
    getVer1MarketplaceItemIdSignals: [Function (anonymous)]
  },
  grid_bots: {
    postVer1GridBotsAi: [Function (anonymous)],
    postVer1GridBotsManual: [Function (anonymous)],
    getVer1GridBotsAiSettings: [Function (anonymous)],
    getVer1GridBots: [Function (anonymous)],
    getVer1GridBotsIdMarketOrders: [Function (anonymous)],
    getVer1GridBotsIdProfits: [Function (anonymous)],
    patchVer1GridBotsIdAi: [Function (anonymous)],
    patchVer1GridBotsIdManual: [Function (anonymous)],
    getVer1GridBotsId: [Function (anonymous)],
    deleteVer1GridBotsId: [Function (anonymous)],
    postVer1GridBotsIdDisable: [Function (anonymous)],
    postVer1GridBotsIdEnable: [Function (anonymous)],
    getVer1GridBotsIdRequiredBalances: [Function (anonymous)]
  },
  loose_accounts: {
    postVer1LooseAccounts: [Function (anonymous)],
    getVer1LooseAccountsAvailableCurrencies: [Function (anonymous)],
    putVer1LooseAccountsAccountId: [Function (anonymous)]
  },
  ping: { getVer1Ping: [Function (anonymous)] },
  time: { getVer1Time: [Function (anonymous)] },
  smart_trades_v2: {
    getV2SmartTrades: [Function (anonymous)],
    postV2SmartTrades: [Function (anonymous)],
    getV2SmartTradesId: [Function (anonymous)],
    deleteV2SmartTradesId: [Function (anonymous)],
    patchV2SmartTradesId: [Function (anonymous)],
    postV2SmartTradesIdReduceFunds: [Function (anonymous)],
    postV2SmartTradesIdAddFunds: [Function (anonymous)],
    postV2SmartTradesIdCloseByMarket: [Function (anonymous)],
    postV2SmartTradesIdForceStart: [Function (anonymous)],
    postV2SmartTradesIdForceProcess: [Function (anonymous)],
    postV2SmartTradesIdSetNote: [Function (anonymous)],
    getV2SmartTradesSmartTradeIdTrades: [Function (anonymous)],
    postV2SmartTradesSmartTradeIdTradesIdCloseByMarket: [Function (anonymous)],
    deleteV2SmartTradesSmartTradeIdTradesId: [Function (anonymous)]
  }
}
*/
