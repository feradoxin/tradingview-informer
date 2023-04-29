const ccxt = require("ccxt");
require ('dotenv').config();

let binance = new ccxt.binance ({
	'apiKey': process.env.BINANCE_TEST_APIKEY,
	'secret': process.env.BINANCE_TEST_SECRET,
	'enablerateLimit': true,
	'options': {
		'createMarketBuyOrderRequiresPrice': false
	}
});

binance.setSandboxMode(true);

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

let params = {
	'symbol': quoteAsset + baseAsset,
	'side': 'SELL',
	'quantity': 0.5,
	'price': 1903,
	'stopPrice': 1900,
	'stopLimitPrice': 1500 * 0.999,
	'stopLimitTimeInForce': 'GTC'
}

binance.privatePostOrderOco(params).then(res => {
	testSlOrderId = res.orderReports[0].orderId
	testTpOrderId = res.orderReports[1].orderId
	longPosition = 'open'
	console.log('==== STOP LOSS ====')
	console.log('Order ID: ' + testSlOrderId)
	console.log('=== TAKE PROFIT ===')
	console.log('Order ID: ' + testTpOrderId)
	binance.fetchOrder(testSlOrderId, symbol).then(res2 => {
		console.log(" ")
		console.log("=== sl order check ===")
		console.log(res2)
	})
	binance.fetchOrder(testTpOrderId, symbol).then(res2 => {
		console.log(" ")
		console.log("=== tp order check ===")
		console.log(res2)
	})
})

function checkOrder() {
	if (longPosition === 'open') {
		binance.fetchOrder(testTpOrderId, symbol).then(res => {
			if (res.status === 'closed') {
				longPosition = 'closed'
				console.log('Take Profit Triggered!')
				console.log('TP Price: ' + res.price)
			}

			if (res.status === 'expired') {
				binance.fetchOrder(testSlOrderId, symbol).then(a => {
					longPosition = 'closed'
					console.log('Stop Loss Triggered!')
					console.log('SL Price: ' + a.price)
				})
			}
		})
	} else {
		return
	}
}

setInterval(() => {
	if (longPosition === 'open') {
		binance.fetchOrder(testTpOrderId, symbol).then(res => {
			if (res.status === 'closed') {
				longPosition = 'closed'
				console.log('Take Profit Triggered!')
				console.log('TP Price: ' + res.price)
			}

			if (res.status === 'expired') {
				binance.fetchOrder(testSlOrderId, symbol).then(a => {
					longPosition = 'closed'
					console.log('Stop Loss Triggered!')
					console.log('SL Price: ' + a.price)
				})
			}
		})
	}
}, 1000)

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