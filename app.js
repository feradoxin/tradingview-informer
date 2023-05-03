const express = require("express");
const app = express();
const fs = require("fs");
const https = require('https');
require ('dotenv').config();
const { Telegraf } = require("telegraf");
const ccxt = require("ccxt");

/** TRADE SETTINGS
 * Change the following to suit your trade market.
 */

const longLeverage = 1;			// Leverage on long orders
const shortLeverage = 1; 		// Leverage on short orders
const quoteAsset = 'ETH';		// Asset to buy/sell, e.g. ETH, BTC, BAT
const baseAsset = 'USDT';		// Currency asset used to buy/sell, e.g. USDT, USDC, BTC
const riskFactor = 1;			// Risk:Reward risk value
const takeProfitFactor = 2;		// Risk:Reward reward value
const marginMode = 'isolated';	// Margin market type: 'isolated' or 'cross'
const tick = 10;				// Update interval in seconds, default 10s to reduce API rate


// // Telegram bot (@frdx_tv_sig_bot)
const tgbot = new Telegraf(process.env.TELEGRAM_TOKEN);
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
	binance.fetchBalance({ 'marginMode' : marginMode }).then(marginBalance => {
		binance.fetchBalance().then(spotBalance => {
			binance.fetchTicker(symbol).then(a => {
				let quoteAssetPrice = a.last;

				// Spot balances
				balanceQuote = spotBalance.free[quoteAsset];
				balanceBase = spotBalance.free[baseAsset];
				initialValue = balanceBase + (balanceQuote * quoteAssetPrice);

				// Margin balances
				marginBalanceQuote = marginBalance[symbol].free[quoteAsset];
				marginBalanceBase = marginBalance[symbol].free[baseAsset];
				marginInitialValue = marginBalanceBase + (marginBalanceQuote * quoteAssetPrice);

				tgbot.telegram.sendMessage(
					chatId,
					"<u>INITIAL SPOT BALANCES</u>\n\n" +
					"<b>ETH: </b><pre>" + balanceQuote + "</pre>\n" +
					"<b>USDT: </b><pre>" + balanceBase + "</pre>\n" +
					"<b>Initial Value: </b>" + initialValue + " USD\n\n" +
					"<u>INITIAL MARGIN BALANCES</u>\n\n" +
					"<b>ETH: </b><pre>" + marginBalanceQuote + "</pre>\n" +
					"<b>USDT: </b><pre>" + marginBalanceBase + "</pre>\n" +
					"<b>Initial Value: </b>" + marginInitialValue + " USD\n\n",
					{ parse_mode : 'HTML' }
				)
			});
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
let marginBalanceBase;
let marginBalanceQuote;
let marginInitialValue;
let marginTotalValue;
const symbol = quoteAsset + '/' + baseAsset;
let signal1;
let signal2;
let longPosition;
let shortPosition;
let longTpOrderId;
let longSlOrderId;
const tickSize = tick * 1000;

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
					let quoteAmount = await binance.amountToPrecision(symbol, (balanceBase * 0.975) / quoteAssetPrice);
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
							
							// Calc trade risk and create SL/TP orders
							let fromTimestamp = binance.milliseconds() - 1800 * 1000;
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
									'stopLimitPrice': binance.priceToPrecision(symbol, stopLossPrice * 0.9998),
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
										"<b>TP Price: </b><pre>" + tpOrder.price + " USDT</pre>\n" +
										"<b>Quantity: </b><pre>" + tpOrder.origQty + "</pre>\n\n" +
										"<u>BALANCES UPDATE</u>\n\n" +
										"<b>ETH: </b><pre>" + balanceQuote + "</pre>\n" +
										"<b>USDT: </b><pre>" + balanceBase + "</pre>\n\n" +
										"<b>Total Value: </b><pre>" + totalValue + "</pre>",
										{ parse_mode : 'HTML' }
									)
								})
							})
						})
					});
				}) ();
			} else {
				// Spot account base asset low, likely long position open. Block further longs and await strategy completion.
				tgbot.telegram.sendMessage(
					chatId,
					"<u>TRADE FAILED</u>\n\n" +
					"Long position active. Current balance is " + balanceBase + " USDT. Awaiting close signal.\n\n",
					{ parse_mode : 'HTML' }
				)
			}

			// Short signal confirmed
			if (signal1 === 'short' && signal2 === 'short' && shortPosition !== 'open') {
				if (marginBalanceBase > 5) { // Check sufficient base balance
					(async () => {
						marginBalanceBase = await binance.fetchBalance({ 'marginMode' : marginMode}).then(res => {
							return res[symbol].free[baseAsset];
						});
						let quoteAssetPrice = await binance.fetchTicker(symbol).then(res => {
							return res.last;
						});
					
						// Borrow quote asset on margin market
						let borrowQuoteAmount = await binance.amountToPrecision(symbol, (marginBalanceBase * shortLeverage * 0.975) / quoteAssetPrice);
						binance.borrowMargin(quoteAsset, borrowQuoteAmount, symbol, { 'marginMode' : marginMode }).then(a => {
							// Short sell quote asset
							binance.createMarketSellOrder(symbol, borrowQuoteAmount, { 'marginMode' : marginMode }).then(b => {
								binance.fetchBalance({ 'marginMode' : marginMode }).then(c => {
									// Fetch margin balances after short position open
									marginBalanceQuote = c[symbol].free[quoteAsset]
									marginBalanceBase = c[symbol].free[baseAsset]
									marginTotalValue = (marginBalanceQuote * quoteAssetPrice) + marginBalanceBase
					
									// Calc range highs and risk value
									let fromTimestamp = binance.milliseconds() - 1800 * 1000;
									binance.fetchOHLCV(symbol, '5m', fromTimestamp, 6).then(d => {
										let candleHighs = [d[0][2],d[1][2],d[2][2],d[3][2],d[4][2],d[5][2]]
										let rangeHigh = candleHighs.sort()[5];
										let risk = rangeHigh - quoteAssetPrice
										let stopLossPrice = quoteAssetPrice + (risk * riskFactor)
										let takeProfitPrice = quoteAssetPrice - (risk * takeProfitFactor)
					
										// Open stop-loss limit order
										binance.createOrder(
											quoteAsset + baseAsset,
											'STOP_LOSS_LIMIT',
											'buy',
											binance.amountToPrecision(symbol, borrowQuoteAmount * 1.001),
											binance.priceToPrecision(symbol, stopLossPrice * 1.0002),
											{
												'stopPrice': binance.priceToPrecision(symbol, stopLossPrice),
												'marginMode': marginMode
											}
										).then(slOrder => {
											// Open take-profit limit order
											binance.createOrder(
												quoteAsset + baseAsset,
												'TAKE_PROFIT_LIMIT',
												'buy',
												binance.amountToPrecision(symbol, borrowQuoteAmount * 1.001),
												binance.priceToPrecision(symbol, takeProfitPrice * 1.0002),
												{
													'stopPrice': binance.priceToPrecision(symbol, takeProfitPrice),
													'marginMode': marginMode
												}
											).then(tpOrder => {
												// Store SL/TP order IDs and mark position open
												shortSlOrderId = slOrder.id
												shortTpOrderId = tpOrder.id
												shortPosition = 'open'
			
												// Telegram reporting
												tgbot.telegram.sendMessage(
													chatId,
													"<u>OPEN SHORT POSITION</u>\n\n" +
													"<b>Market: </b><pre>" + b.symbol + "</pre>\n" +
													"<b>Leverage: </b><pre>" + shortLeverage + "</pre>\n" +
													"<b>Borrowed: </b><pre>" + borrowQuoteAmount + " " + quoteAsset + "</pre>\n" +
													"<b>Executed: </b><pre>" + b.filled + " " + quoteAsset + "</pre>\n" +
													"<b>TradeID: </b><pre>" + b.clientOrderId + "</pre>\n" +
													"<b>Execution Timestamp: </b><pre>" + b.datetime + "</pre>\n" +
													"<b>Status: </b><pre>" + b.info.status + "</pre>\n" +
													"<b>Price: </b><pre>" + b.price + " " + baseAsset + "</pre>\n" +
													"<b>Cost: </b><pre>" + b.cost + "</pre>\n\n" +
													"Chart: https://www.tradingview.com/chart/w9Jx4CUu/",
													{ parse_mode : 'HTML' , disable_web_page_preview : true }
												)
			
												tgbot.telegram.sendMessage(
													chatId,
													"<u>SL/TP PARAMS</u>\n" +
													"<b>Risk: </b><pre>" + risk + "</pre>\n" + 
													"<b>SL Factor: </b><pre>" + riskFactor + "</pre>\n" +
													"<b>TP Factor: </b><pre>" + takeProfitFactor + "</pre>\n\n" +
													"<u>STOP LOSS OPENED</u>\n" +
													"<b>Order ID: </b><pre>" + shortSlOrderId + "</pre>\n" + 
													"<b>SL Price: </b><pre>" + slOrder.price + " USDT</pre>\n" +
													"<b>Quantity: </b><pre>" + slOrder.amount + "</pre>\n\n" + 
													"<u>TAKE PROFIT OPENED</u>\n" +
													"<b>Order ID: </b><pre>" + shortTpOrderId + "</pre>\n" + 
													"<b>TP Price: </b><pre>" + tpOrder.price + " USDT</pre>\n" +
													"<b>Quantity: </b><pre>" + tpOrder.amount + "</pre>\n\n",
													{ parse_mode : 'HTML' }
												)
											})
										})
									})
								})
							})
						});
					}) ();
				} else {
					// Margin account base asset low, likely short position open. Block further shorts and await strategy completion.
					tgbot.telegram.sendMessage(
						chatId,
						"<u>TRADE FAILED</u>\n\n" +
						"Short position active. Current margin balance is " + marginBalanceBase + " USDT. Awaiting close signal.\n\n",
						{ parse_mode : 'HTML' }
					)
				}
			}
		}
	}
})


setInterval(() => {
	// Update balances for spot and margin accounts
	binance.fetchBalance().then(balances => {
		balanceBase = balances.free[baseAsset]
	})
	binance.fetchBalance({ 'marginMode' : marginMode }).then(balances => {
		marginBalanceBase = balances[symbol].free[baseAsset]
	})

	// Check for active long positions
	if (longPosition === 'open') {
		// Check spot long TAKE-PROFIT triggered
		binance.fetchOrder(longTpOrderId, symbol).then(a => {
			if (a.status === 'closed') {
				// TP Triggered -> calc balances and pnl, then report to telegram
				longPosition = 'closed' // Set long-position to closed
				binance.fetchBalance().then(balances => {
					balanceQuote = balances.free[quoteAsset];
					balanceBase = balances.free[baseAsset];
					totalValue = (balanceQuote * a.price) + balanceBase;
					let pnl = parseFloat((totalValue - initialValue) / initialValue * 100).toFixed(2);
					tgbot.telegram.sendMessage(
						chatId,
						"<u>LONG POSITION: TAKE-PROFIT TRIGGERED</u>\n" +
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
				// SL Triggered -> calc balances and pnl, then report to telegram
				binance.fetchOrder(longSlOrderId, symbol).then(b => {
					longPosition = 'closed' // Set long-position to closed
					binance.fetchBalance().then(balances => {
						balanceQuote = balances.free[quoteAsset];
						balanceBase = balances.free[baseAsset];
						totalValue = (balanceQuote * b.price) + balanceBase;
						let pnl = parseFloat((totalValue - initialValue) / initialValue * 100).toFixed(2);
						tgbot.telegram.sendMessage(
							chatId,
							"<u>LONG POSITION: STOP-LOSS TRIGGERED</u>\n" +
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

	// Check for active short-positions on margin
	if (shortPosition === 'open') {
		// Check margin short TAKE-PROFIT triggered
		binance.fetchOrder(shortTpOrderId, symbol, { 'marginMode' : marginMode }).then(b => {
			if (b.status === 'closed') {
				// TP Triggered -> fetch borrowed amount and interest then repay
				binance.fetchBorrowInterest(quoteAsset, symbol, undefined, 1, { 'marginMode' : marginMode }).then(c => {
					let repayAmount = c[0].info.principal + res[0].info.interest
					binance.repayMargin(quoteAsset, repayAmount, symbol, { 'marginMode': marginMode }).then(d => {
						// Set short-position to closed
						shortPosition = 'closed'
	
						// Cancel stop-loss limit order
						binance.cancelOrder(shortSlOrderId, symbol, { 'marginMode' : marginMode })
	
						// Fetch margin balances, calc PNL, and report to Telegram
						binance.fetchBalance({ 'marginMode' : marginMode }).then(e => {
							marginBalanceBase = c[symbol].free[baseAsset]
							marginBalanceQuote = c[symbol].free[quoteAsset]
							marginTotalValue = (marginBalanceQuote * b.price) + marginBalanceBase
							let pnl = parseFloat((marginTotalValue - marginInitialValue) / marginInitialValue * 100).toFixed(2)
							tgbot.telegram.sendMessage(
								chatId,
								"<u>SHORT POSITION: TAKE-PROFIT TRIGGERED</u>\n" +
								"<b>TP Price: </b><pre>" + b.price + "</pre>\n" +
								"<b>Trigger Time: </b><pre>" + b.datetime + "</pre>\n\n" +
								"<u>BALANCES UPDATE</u>\n" +
								"<b>ETH: </b><pre>" + marginBalanceQuote + "</pre>\n" +
								"<b>USDT: </b><pre>" + marginBalanceBase + "</pre>\n\n" +
								"<b>Total Value: </b><pre>" + marginTotalValue + "</pre>\n\n" +
								"<b>P&L: </b>" + pnl + "%",
								{ parse_mode : 'HTML' }
							)
						})
					})
				})
			}
		})
	
		// Check margin short STOP-LOSS triggered
		binance.fetchOrder(shortSlOrderId, symbol, { 'marginMode' : marginMode }).then(b => {
			if (b.status === 'closed') {
				// SL Triggered -> fetch borrowed amount and interest then repay
				binance.fetchBorrowInterest(quoteAsset, symbol, undefined, 1, { 'marginMode' : marginMode }).then(c => {
					let repayAmount = c[0].info.principal + res[0].info.interest
					binance.repayMargin(quoteAsset, repayAmount, symbol, { 'marginMode': marginMode }).then(d => {
						// Set short-position to closed
						shortPosition = 'closed'
	
						// Cancel take-profit limit order
						binance.cancelOrder(shortTpOrderId, symbol, { 'marginMode' : marginMode })
	
						// Fetch margin balances, calc PNL, and report to Telegram
						binance.fetchBalance({ 'marginMode' : marginMode }).then(e => {
							marginBalanceBase = c[symbol].free[baseAsset]
							marginBalanceQuote = c[symbol].free[quoteAsset]
							marginTotalValue = (marginBalanceQuote * b.price) + marginBalanceBase
							let pnl = parseFloat((marginTotalValue - marginInitialValue) / marginInitialValue * 100).toFixed(2)
							tgbot.telegram.sendMessage(
								chatId,
								"<u>SHORT POSITION: STOP-LOSS TRIGGERED</u>\n" +
								"<b>SL Price: </b><pre>" + b.price + "</pre>\n" +
								"<b>Trigger Time: </b><pre>" + b.datetime + "</pre>\n\n" +
								"<u>BALANCES UPDATE</u>\n" +
								"<b>ETH: </b><pre>" + marginBalanceQuote + "</pre>\n" +
								"<b>USDT: </b><pre>" + marginBalanceBase + "</pre>\n\n" +
								"<b>Total Value: </b><pre>" + marginTotalValue + "</pre>\n\n" +
								"<b>P&L: </b>" + pnl + "%",
								{ parse_mode : 'HTML' }
							)
						})
					})
				})
			}
		})
	}
}, tickSize)