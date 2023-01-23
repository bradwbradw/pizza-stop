var _ = require('lodash');

var chains = {
  "56": {
    name: "binance-smart-chain",
    ws: process.env.WS_56,
    http: process.env.HTTP_56,
    scan: "https://api.bscscan.com/api",
    native: "BNB",
    lookup: "bsc",
    usd: "0xe9e7cea3dedca5984780bafc599bd69add087d56"
  },
  "137": {
    name: "polygon-pos",
    ws: process.env.WS_137,
    http: process.env.HTTP_137,
    scan: "https://api.polygonscan.com/api",
    native: "MATIC",
    lookup: "polygon"
  },
  "250": {
    name: "fantom",
    ws: process.env.WS_250,
    http: process.env.HTTP_250,
    scan: "https://api.ftmscan.com/api",
    native: "FTM",
    lookup: "fantom"
  },
  "43114": {
    name: "avalanche",
    lookup: "avalanche",
    ws: process.env.WS_43114,
    http: process.env.HTTP_43114,
    scan: "https://api.snowtrace.io/api",
    native: "AVAX"
  },
  "42161": {
    name: "arbitrum-one",
    lookup: "arbitrum-one",
    native: "eth",
    scan: "https://api.arbiscan.io/api",
    ws: process.env.WS_42161,
    http: process.env.HTTP_42161
  },
  "1": {
    name: "ethereum",
    lookup: "eth",
    ws: process.env.WS_1,
    http: process.env.HTTP_1,
    scan: "https://api.etherscan.io/api",
    native: "ETH"
  },
  "9001": {
    name: "evmos",
    lookup: "evmos",
    http: "https://eth.bd.evmos.org:8545/",
    scan: "https://evm.evmos.org/api",
    native: "EVMOS"
  },

  "1284": {
    name: "moonbeam",
    lookup: "moonbeam",
    http: "https://rpc.api.moonbeam.network/",
    scan: "https://api-moonbeam.moonscan.io/api",
    native: "GLMR"
  }
};

chains.all = _.keys(chains);


module.exports = chains


/*

Evmos Network for Metamask 
Network Name: Evmos Mainnet
New RPC URL: https://eth.bd.evmos.org:8545/
Chain ID: 9001
Currency Symbol: EVMOS
Block Explorer URL (optional): https://evm.evmos.org/


Moonbeam Network for Metamask
Network Name: Moonbeam
RPC URL: https://rpc.api.moonbeam.network/
Chain ID: 1284 
Symbol: GLMR
Block Explorer (optional): https://moonscan.io/
coingecko names for weth platforms

        "ethereum": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "xdai": "0x6a023ccd1ff6f2045c3309768ead9e68f978f6e1",
        "polygon-pos": "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619",
        "fantom": "0x74b23882a30290451a17c44f4f05243b6b58c76d",
        "avalanche": "0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab",
        "arbitrum-one": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "sora": "0x0200070000000000000000000000000000000000000000000000000000000000",
        "moonbeam": "0xfa9343c3897324496a05fc75abed6bac29f8a40f",
        "harmony-shard-0": "0x6983d1e6def3690c4d616b13597a09e6193ea013",
        "celo": "0x2def4285787d58a2f811af24755a8150622f4361",
        "ronin": "0xc99a6a985ed2cac1ef41640596c5a5f9f4e19ef5",
        "boba": "0xdeaddeaddeaddeaddeaddeaddeaddeaddead0000",
        "cronos": "0xe44fd7fcb2b1581822d0c862b68222998a0c299a",
        "optimistic-ethereum": "0x4200000000000000000000000000000000000006",
        "tron": "THb4CqiFdwNHsWsQCs4JhzwjMWys4aqCbF",
        "binance-smart-chain": "0x2170ed0880ac9a755fd29b2688956bd959f933f8",
        "aurora": "0xc9bdeed33cd01541e1eed10f90519d2c06fe3feb",
        "metis-andromeda": "0x420000000000000000000000000000000000000a",
        "fuse": "0xa722c13135930332eb3d749b2f0906559d2c5b99",
        "kucoin-community-chain": "0xf55af137a98607f7ed2efefa4cd2dfe70e4253b1",
        "moonriver": "0x639a647fbe20b6c8ac19e48e2de44ea792c62c5c",
        "tomochain": "0x2eaa73bd0db20c64f53febea7b5f5e5bccc7fb8b",
        "kardiachain": "0x1540020a94aa8bc189aa97639da213a4ca49d9a7",
        "meter": "0x79a61d3a28f8c8537a3df63092927cfa1150fb3c",
        "theta": "0x3674d64aab971ab974b2035667a4b3d09b5ec2b3",
        "telos": "0xfa9343c3897324496a05fc75abed6bac29f8a40f",
        "syscoin": "0x7c598c96d02398d89fbcb9d41eab3df0c16f227d",
        "milkomeda-cardano": "0xe3f5a90f9cb311505cd691a46596599aa1a0ad7d",
        "elastos": "0x802c3e839e4fdb10af583e3e759239ec7703501e",
        "conflux": "0xa47f43de2f9623acb395ca4905746496d2014d57",
        "energi": "0x78b050d981d7f6e019bf6e361d0d1167de6b19da",
        "cosmos": "ibc/EA1D43981D5C9A1C4AAEA9C23BB1D4FA126BA9BC7020A25E0AE4AA841EA25DC5",
        "astar": "0x81ecac0d6be0550a00ff064a4f9dd2400585fe9c",
        "sx-network": "0xa173954cc4b1810c0dbdb007522adbc182dab380",
        "kava": "0xe3f5a90f9cb311505cd691a46596599aa1a0ad7d",
        "cube": "0x57eea49ec1087695274a9c4f341e414eb64328c2"

        */