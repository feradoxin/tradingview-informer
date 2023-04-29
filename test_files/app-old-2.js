/** Old logic [DEPRECATED]
 *  Previous version in use till 230429.
 */

const express = require("express");
const app = express();
const fs = require("fs");
const https = require('https');
require ('dotenv').config();
const { Telegraf } = require("telegraf");
const ccxt = require("ccxt");


// Telegram bot (@frdx_tv_sig_bot)
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
	binance.fetchBalance ().then(balances => {
		binance.fetchTicker ('ETH/USDT').then(res => {
			let ethPrice = res.last;
			balanceETH = balances.free.ETH;
			balanceUSDT = balances.free.USDT;
			initialVal = balanceUSDT + (balanceETH * ethPrice);
			tgbot.telegram.sendMessage(
				chatId,
				"<u>CURRENT BALANCES</u>\n\n" +
				"<b>ETH: </b><pre>" + balanceETH + "</pre>\n" +
				"<b>USDT: </b><pre>" + balanceUSDT + "</pre>\n\n" +
				"<b>Initial Value: </b>" + initialVal + " USD",
				{ parse_mode : 'HTML' }
			)
		});
	})
});

app.use(express.json());
app.use(express.static(__dirname + '/home/ubuntu/static', { dotfiles: 'allow' }));

// Instantiate exchange (Binance)
// Replace BINANCE_* with BINANCE_TEST_* for testnet/sandbox.
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

// Global vars
let balanceUSDT;
let balanceETH;
let totalVal;
let prevTotalVal;
let initialVal;

// ETHUSDT Long logic
app.post('/api/v1/long/ethusdt', function (req, res) {
	let payload = req.body;
	let apiKey = payload.apiKey;
	
	if (!apiKey || apiKey !== process.env.APP_APIKEY) {
		res.status(401).json({error: 'unauthorised'});
	} else {
		if (payload.signal === "open") {
			// Open long if USDT balance sufficient
			if (balanceUSDT > 5) {
				(async () => {
					let symbol = "ETH/USDT";
					balanceUSDT = await binance.fetchBalance ().then(res => {
						return res.free.USDT;
					});
					let ethPrice = await binance.fetchTicker ('ETH/USDT').then(res => {
						return res.last;
					});
					let ethAmount = (balanceUSDT * 0.975) / ethPrice;
					binance.createMarketBuyOrder(symbol, ethAmount).then(res => {
						tgbot.telegram.sendMessage(
							chatId,
							"<u>TRADE EXECUTED</u>\n\n" +
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
						binance.fetchBalance ().then(balances => {
							balanceETH = balances.free.ETH;
							balanceUSDT = balances.free.USDT;
							totalVal = (balanceETH * ethPrice) + balanceUSDT;
							prevTotalVal = totalVal;
							tgbot.telegram.sendMessage(
								chatId,
								"<u>BALANCES UPDATE</u>\n\n" +
								"<b>ETH: </b><pre>" + balanceETH + "</pre>\n" +
								"<b>USDT: </b><pre>" + balanceUSDT + "</pre>\n\n" +
								"<b>Total Value: </b><pre>" + totalVal + "</pre>",
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
					"Long position active. Current balance is " + balanceUSDT + " USDT. Awaiting close signal.\n\n",
					{ parse_mode : 'HTML' }
				)
			}
		}

		if (payload.signal === "close" && balanceETH > 0.001) {
			if (balanceETH > 0.001) {
				// Close long position if ETH balance sufficient.
				(async () => {
					let symbol = "ETH/USDT";
					let ethAmount = await binance.fetchBalance ().then(res => {
						return res.free.ETH;
					});
					let ethPrice = await binance.fetchTicker ('ETH/USDT').then(res => {
						return res.last;
					});
					binance.createMarketSellOrder(symbol, ethAmount).then(res => {
						tgbot.telegram.sendMessage(
							chatId,
							"<u>TRADE EXECUTED</u>\n\n" +
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
						binance.fetchBalance ().then(balances => {
							balanceETH = balances.free.ETH;
							balanceUSDT = balances.free.USDT;
							totalVal = (balanceETH * ethPrice) + balanceUSDT;
							let pnl = parseFloat((totalVal - prevTotalVal) / prevTotalVal * 100).toFixed(2);
							let totalPnl = parseFloat((totalVal - initialVal) / initialVal * 100).toFixed(2);
							tgbot.telegram.sendMessage(
								chatId,
								"<u>BALANCES UPDATE</u>\n\n" +
								"<b>ETH: </b><pre>" + balanceETH + "</pre>\n" +
								"<b>USDT: </b><pre>" + balanceUSDT + "</pre>\n\n" +
								"<b>Total Value: </b><pre>" + totalVal + "</pre>\n\n" +
								"<b>Trade P&L: </b>" + pnl + "%\n" +
								"<b>Total P&L: </b>" + totalPnl + "%",
								{ parse_mode : 'HTML' }
							)
						})
					});
				}) ();
			} else {
				// Insufficient ETH balance, likely no existing long position.
				tgbot.telegram.sendMessage(
					chatId,
					"<u>TRADE FAILED</u>\n\n" +
					"No long position active. Current balance is " + balanceETH + " ETH. Awaiting next long signal.\n\n",
					{ parse_mode : 'HTML' }
				)
			}
		}
	}
})
