const ccxt = require("ccxt");
require ('dotenv').config();

let binance = new ccxt.binance ({
	'apiKey': process.env.BINANCE_APIKEY,
	'secret': process.env.BINANCE_SECRET,
	'enablerateLimit': true,
	'options': {
		'createMarketBuyOrderRequiresPrice': false
	}
});

let quoteAsset = 'ETH'
let baseAsset = 'USDT'

binance.fetchBalance().then(res => {
    console.log("ETH Bal.: " + res.free[quoteAsset])
    console.log("USDT Bal.: " + res.free[baseAsset])
})