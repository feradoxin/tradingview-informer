const express = require("express");
const app = express();
const fs = require("fs");
const https = require('https');
require ('dotenv').config();
const { Telegraf } = require("telegraf");
const ccxt = require("ccxt");

/** TRADE SETTINGS
 * Change the following to suit your trade market.
 * Leverage long/short param: margin leverage level
 * Quote Asset: Asset to buy/sell, e.g. ETH, BTC, BAT
 * Base Asset: Currency used to buy/sell, e.g. USDT, USDC, BTC
 */
const leverageLong = 1;
const leverageShort = 1;
const quoteAsset = 'ETH';
const baseAsset = 'USDT';


// // Telegram bot (@frdx_tv_sig_bot)
const tgbot = new Telegraf(process.env.TELEGRAM_TOKEN)
const chatId = process.env.TELEGRAM_CHATID;


// Express server config
https.createServer(
    {
        key: fs.readFileSync('/etc/letsencrypt/live/sss.akashic.tech/privkey.pem', 'utf8'),
        cert: fs.readFileSync('/etc/letsencrypt/live/sss.akashic.tech/cert.pem'),
        ca: fs.readFileSync('/etc/letsencrypt/live/sss.akashic.tech/chain.pem')
    },
    app
).listen(443, () => {
    console.log("HTTPS Express server running on port 443...");
    tgbot.telegram.sendMessage(
        chatId,
        "MP Auto-tader started.\n" +
        "Awaiting signals from Tradingview.\n\n" +
        "<u><b>TRADING: MARKETS CONNECTED</b></u>\n" +
        "<pre>[1] BINANCE:ETHUSDT</pre>\n\n" +
		"Chart: https://www.tradingview.com/chart/w9Jx4CUu/",
        { parse_mode : 'HTML' , disable_web_page_preview : true }
    );
	// Initial balance update to global vars
	binance.fetchBalance().then(balances => {
		binance.fetchTicker (symbol).then(res => {
			let quoteAssetPrice = res.last;
			balanceQuote = balances.free[quoteAsset];
			balanceBase = balances.free[baseAsset];
			initialValue = balanceBase + (balanceQuote * quoteAssetPrice);
			tgbot.telegram.sendMessage(
				chatId,
				"<u>CURRENT BALANCES</u>\n\n" +
				"<b>ETH: </b><pre>" + balanceQuote + "</pre>\n" +
				"<b>USDT: </b><pre>" + balanceBase + "</pre>\n\n" +
				"<b>Initial Value: </b>" + initialValue + " USD",
				{ parse_mode : 'HTML' }
			)
		});
	})
});

app.use(express.json());
app.use(express.static(__dirname + '/home/ubuntu/static', { dotfiles: 'allow' }));

// Instantiate exchange (Binance)
let binance = new ccxt.binance ({
	'apiKey': process.env.BINANCE_APIKEY,
	'secret': process.env.BINANCE_SECRET,
	'enablerateLimit': true,
	'options': {
		'createMarketBuyOrderRequiresPrice': false
	}
});

// Uncomment to use Binance Testnet
// Generate testnet keys at https://testnet.binance.vision/
// binance.setSandboxMode (true);

// Trading logic global vars
let balanceBase;
let balanceQuote;
let totalValue;
let prevTotalValue;
let initialValue;
const symbol = quoteAsset + '/' + baseAsset;
let borrowedQuoteAmount;
let signal1;
let signal2;
let longPosition;
let shortPosition;
let fromTimestamp = binance.milliseconds() - 1800 * 1000;

// Signal logic
app.post('/api/v1/' + quoteAsset + baseAsset, function (req, res) {
	let payload = req.body;
	let apiKey = payload.apiKey;
	
	if (!apiKey || apiKey !== process.env.APP_APIKEY) {
		res.status(401).json({error: 'unauthorised'});
	} else {
		if (payload.lorentzian !== undefined) {
			res.status(200).json({STATUS: 'ok'})
			signal1 = payload.lorentzian
		}

		if (payload.macd !== undefined) {
			res.status(200).json({STATUS: 'ok'})
			signal2 = payload.macd
		}

		if (signal1 === 'long' && signal2 === 'long' && longPosition !== 'open') {
			if (balanceBase > 5) {
				(async () => {
					balanceBase = await binance.fetchBalance().then(res => {
						return res.free[baseAsset];
					});
					let quoteAssetPrice = await binance.fetchTicker (symbol).then(res => {
						return res.last;
					});
					let ethAmount = (balanceBase * 0.975) / quoteAssetPrice;
					binance.createMarketBuyOrder(symbol, ethAmount).then(res => {
						tgbot.telegram.sendMessage(
							chatId,
							"<u>OPEN LONG POSITION</u>\n\n" +
							"<b>Market: </b><pre>" + res.symbol + "</pre>\n" +
							"<b>Type: </b><pre>" + res.info.type + "</pre>\n" +
							"<b>Side: </b><pre>" + res.info.side + "</pre>\n" +
							"<b>TradeID: </b><pre>" + res.clientOrderId + "</pre>\n" +
							"<b>Execution Timestamp: </b><pre>" + res.datetime + "</pre>\n" +
							"<b>Status: </b><pre>" + res.info.status + "</pre>\n" +
							"<b>Price: </b><pre>" + res.price + " USDT</pre>\n" +
							"<b>Quantity: </b><pre>" + res.filled + " ETH</pre>\n\n" +
							"Chart: https://www.tradingview.com/chart/w9Jx4CUu/",
							{ parse_mode : 'HTML' , disable_web_page_preview : true }
						)
						binance.fetchBalance().then(balances => {
							balanceQuote = balances.free[quoteAsset];
							balanceBase = balances.free[baseAsset];
							totalValue = (balanceQuote * quoteAssetPrice) + balanceBase;
							prevTotalValue = totalValue;
							tgbot.telegram.sendMessage(
								chatId,
								"<u>BALANCES UPDATE</u>\n\n" +
								"<b>ETH: </b><pre>" + balanceQuote + "</pre>\n" +
								"<b>USDT: </b><pre>" + balanceBase + "</pre>\n\n" +
								"<b>Total Value: </b><pre>" + totalValue + "</pre>",
								{ parse_mode : 'HTML' }
							)
						})
					});
				}) ();
			} else {
				// Insufficient USDT balance, likely existing long position open.
				tgbot.telegram.sendMessage(
					chatId,
					"<u>TRADE FAILED</u>\n\n" +
					"Long position active. Current balance is " + balanceBase + " USDT. Awaiting close signal.\n\n",
					{ parse_mode : 'HTML' }
				)
			}
			longPosition = 'open';
			shortPosition = 'close';
		}
		
		if (signal1 === 'short' && signal2 === 'short' && shortPosition !== 'open') {
			console.log("OPENING SHORT");
			shortPosition = 'open';
			longPosition = 'close';
		}
	}
})


// (async () => {
// 	binance.fetchOHLCV(symbol, '5m', fromTimestamp, 6).then(res => {
// 		console.log(res)
// 		let candleLows = [res[1][3],res[2][3],res[3][3],res[4][3],res[5][3]]
// 		let rangeLow = candleLows.sort()[0];
// 		let price = binance.fetchTicker(symbol).then(res => {
// 			let price = res.last;
// 			let risk = price - rangeLow;
// 			let stopLoss = price - risk;
// 			let takeProfit = price + (risk * 2);
// 			console.log("Risk Val: " + risk);
// 			console.log("ETH/USDT: " + price);
// 			console.log("Take Profit: " + takeProfit);
// 			console.log("Stop Loss: " + stopLoss)
// 		})
// 	})
// })



// // Shorting
// // Global var
// let borrowedEthAmt = 0.0055;

// // Open short
// (async () => {
// 	const marginMode = 'isolated';
// 	const marginBalance = await binance.fetchBalance({ 'defaultType': 'margin', 'marginMode': marginMode }).then(res => {
// 		return res[symbol]['USDT']['free'];
// 	})
// 	const orderPrice = undefined;
// 	const quoteAssetPrice = await binance.fetchTicker(symbol).then(res => {
// 		return res.last;
// 	})
// 	// borrowedEthAmt = parseFloat((marginBalance * 0.8) / quoteAssetPrice).toFixed(4);
// 	console.log('Margin Bal.: ' + marginBalance + ' USDT');
// 	console.log('ETH Price: ' + quoteAssetPrice + ' USDT');
// 	console.log('ETH Amount: ' + borrowedEthAmt + ' ETH');
// 	binance.borrowMargin('ETH', borrowedEthAmt, symbol, { 'marginMode': marginMode }).then(res => {
// 		console.log(res)
// 	});
// 	binance.createOrder(symbol, 'market', 'sell', borrowedEthAmt, orderPrice, { 'marginMode': marginMode }).then(res => {
// 		console.log(res);
// 	})
// }) ();

// // Close short
// (async () => {
// 	const marginMode ='isolated';
// 	const orderPrice = undefined;
// 	binance.createOrder(symbol, 'market', 'buy', borrowedEthAmt, orderPrice, { 'marginMode': marginMode }).then(res => {
// 		console.log(res);
// 	});
// 	binance.repayMargin('ETH', borrowedEthAmt, symbol, { 'marginMode': marginMode }).then(res => {
// 		console.log(res)
// 	});
// }) ();

// binance.fetchPositions()
