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

// binance.setSandboxMode(true);

let quoteAsset = 'ETH'
let baseAsset = 'USDT'
let symbol = quoteAsset + '/' + baseAsset

// binance.fetchBalance().then(res => {
//     console.log("ETH Bal.: " + res.free[quoteAsset])
//     console.log("USDT Bal.: " + res.free[baseAsset])
// })

binance.loadMarkets()
let testSlOrderId;
let testTpOrderId;
let longPosition;

// binance.fetchOrder(testOrderId, symbol).then(res => {
// 	console.log(res)
// })

// binance.cancelOrder(testOrderId, symbol).then(res => {
// 	console.log(res)
// 	binance.fetchOrder( testOrderId, symbol ).then(res2 => {
// 		console.log(res2)
// 	})
// })

// binance.cancelAllOrders(symbol)


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

let marginBalanceBase;
let marginBalanceQuote;
let marginInitialValue;
let marginTotalValue;
let shortTpOrderId;
let shortSlOrderId;
let marginMode = 'isolated';
let shortLeverage = 1


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

									// Store new balances after SL/TP positions opened
									binance.fetchBalance({ 'marginMode' : marginMode }).then(e => {
										marginBalanceQuote = c[symbol].free[quoteAsset]
									})

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


let riskFactor = 1
let takeProfitFactor = 2



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