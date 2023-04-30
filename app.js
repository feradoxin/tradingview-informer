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
const riskFactor = 1;
const takeProfitFactor = 2;


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
let initialValue;
const symbol = quoteAsset + '/' + baseAsset;
let borrowedQuoteAmount;
let signal1;
let signal2;
let longPosition;
let shortPosition;
let fromTimestamp = binance.milliseconds() - 1800 * 1000;
let longTpOrderId;
let longSlOrderId;

// Trading Logic
app.post('/api/v1/' + quoteAsset + baseAsset, function (req, res) {
	let payload = req.body;
	let apiKey = payload.apiKey;
	
	if (!apiKey || apiKey !== process.env.APP_APIKEY) {
		res.status(401).json({error: 'unauthorised'});
	} else {
		// Process signals from Tradingview
		if (payload.lorentzian !== undefined) {
			res.status(200).json({STATUS: 'ok'})
			signal1 = payload.lorentzian
		}

		if (payload.macd !== undefined) {
			res.status(200).json({STATUS: 'ok'})
			signal2 = payload.macd
		}

		// Long signal confirmed
		if (signal1 === 'long' && signal2 === 'long' && longPosition !== 'open') {
			if (balanceBase > 5) { // Check sufficient base balance
				(async () => {
					balanceBase = await binance.fetchBalance().then(res => {
						return res.free[baseAsset];
					});
					let quoteAssetPrice = await binance.fetchTicker (symbol).then(res => {
						return res.last;
					});
					let quoteAmount = binance.amountToPrecision(symbol, (balanceBase * 0.975) / quoteAssetPrice);
					// Open long market order
					binance.createMarketBuyOrder(symbol, quoteAmount).then(res => {
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
							tgbot.telegram.sendMessage(
								chatId,
								"<u>BALANCES UPDATE</u>\n\n" +
								"<b>ETH: </b><pre>" + balanceQuote + "</pre>\n" +
								"<b>USDT: </b><pre>" + balanceBase + "</pre>\n\n" +
								"<b>Total Value: </b><pre>" + totalValue + "</pre>",
								{ parse_mode : 'HTML' }
							)
							// Calc trade risk and create SL/TP orders
							binance.fetchOHLCV(symbol, '5m', fromTimestamp, 6).then(a => {
								let candleLows = [a[0][3],a[1][3],a[2][3],a[3][3],a[4][3],a[5][3]]
								let rangeLow = candleLows.sort()[0];
								let risk = quoteAssetPrice - rangeLow
								let stopLossPrice = quoteAssetPrice - (risk * riskFactor)
								let takeProfitPrice = quoteAssetPrice + (risk * takeProfitFactor)
								let params = {
									'symbol': quoteAsset + baseAsset,
									'side': 'SELL',
									'quantity': binance.amountToPrecision(symbol, quoteAmount),
									'price': binance.priceToPrecision(symbol, takeProfitPrice),
									'stopPrice': binance.priceToPrecision(symbol, stopLossPrice),
									'stopLimitPrice': binance.priceToPrecision(symbol, stopLossPrice * 0.999),
									'stopLimitTimeInForce': 'GTC'
								}
								binance.privatePostOrderOco(params).then(b => {
									let slOrder = b.orderReports[0];
									let tpOrder = b.orderReports[1];
									longSlOrderId = slOrder.orderId;
									longTpOrderId = tpOrder.orderId;
									longPosition = 'open';
									tgbot.telegram.sendMessage(
										chatId,
										"<u>SL/TP PARAMS</u>\n" +
										"<b>Risk: </b><pre>" + risk + "</pre>\n" + 
										"<b>SL Factor: </b><pre>" + riskFactor + "</pre>\n" +
										"<b>TP Factor: </b><pre>" + takeProfitFactor + "</pre>\n\n" +
										"<u>STOP LOSS OPENED</u>\n" +
										"<b>Order ID: </b><pre>" + longSlOrderId + "</pre>\n" + 
										"<b>SL Price: </b><pre>" + slOrder.price + " USDT</pre>\n" +
										"<b>Quantity: </b><pre>" + slOrder.origQty + "</pre>\n\n" + 
										"<u>TAKE PROFIT OPENED</u>\n" +
										"<b>Order ID: </b><pre>" + longTpOrderId + "</pre>\n" + 
										"<b>SL Price: </b><pre>" + tpOrder.price + " USDT</pre>\n" +
										"<b>Quantity: </b><pre>" + tpOrder.origQty + "</pre>\n\n",
										{ parse_mode : 'HTML' }
									)
								})
							})
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
		}
		
		/** TO DO
		 *  Add short trading logic and order creation with SL/TP
		 */
		// Short signal confirmed
		// if (signal1 === 'short' && signal2 === 'short' && shortPosition !== 'open') {
		// 	console.log("OPENING SHORT");
		// 	shortPosition = 'open';
		// 	longPosition = 'close';
		// }
	}
})

setInterval(() => {
	binance.fetchBalance().then(balances => {
		balanceBase = balances.free[balanceBase]
	})
	if (longPosition === 'open') {
		binance.fetchOrder(longTpOrderId, symbol).then(a => {
			if (a.status === 'closed') {
				longPosition = 'closed'
				binance.fetchBalance().then(balances => {
					balanceQuote = balances.free[quoteAsset];
					balanceBase = balances.free[baseAsset];
					totalValue = (balanceQuote * a.price) + balanceBase;
					let pnl = parseFloat((totalValue - initialValue) / initialValue * 100).toFixed(2);
					tgbot.telegram.sendMessage(
						chatId,
						"<u>TAKE PROFIT TRIGGERED</u>\n" +
						"<b>TP Price: </b><pre>" + a.price + "</pre>\n" +
						"<b>Trigger Time: </b><pre>" + a.datetime + "</pre>\n\n" +
						"<u>BALANCES UPDATE</u>\n" +
						"<b>ETH: </b><pre>" + balanceQuote + "</pre>\n" +
						"<b>USDT: </b><pre>" + balanceBase + "</pre>\n\n" +
						"<b>Total Value: </b><pre>" + totalValue + "</pre>\n\n" +
						"<b>P&L: </b>" + pnl + "%",
						{ parse_mode : 'HTML' }
					)
				})
			}

			if (a.status === 'expired') {
				binance.fetchOrder(longSlOrderId, symbol).then(b => {
					longPosition = 'closed'
					binance.fetchBalance().then(balances => {
						balanceQuote = balances.free[quoteAsset];
						balanceBase = balances.free[baseAsset];
						totalValue = (balanceQuote * b.price) + balanceBase;
						let pnl = parseFloat((totalValue - initialValue) / initialValue * 100).toFixed(2);
						tgbot.telegram.sendMessage(
							chatId,
							"<u>STOP LOSS TRIGGERED</u>\n" +
							"<b>SL Price: </b><pre>" + b.price + "</pre>\n" +
							"<b>Trigger Time: </b><pre>" + b.datetime + "</pre>\n\n" +
							"<u>BALANCES UPDATE</u>\n" +
							"<b>ETH: </b><pre>" + balanceQuote + "</pre>\n" +
							"<b>USDT: </b><pre>" + balanceBase + "</pre>\n\n" +
							"<b>Total Value: </b><pre>" + totalValue + "</pre>\n\n" +
							"<b>P&L: </b>" + pnl + "%",
							{ parse_mode : 'HTML' }
						)
					})
				})
			}
		})
	}
}, 10000)