/**
 * This script has been deprecated. Tradingview signals and puppeteer screenshot functions removed.
 * New script auto-trades based on signal inputs.
 * Please check packages and API endpoints on re-implementation.
 */

const express = require("express");
const app = express();
const puppeteer = require("puppeteer");
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
        "Express server running.\n" +
        "Awaiting indicator signals from Tradingview.\n\n" +
        "<u><b>SIGNALS: MARKETS ENABLED</b></u>\n" +
        "<pre>[1] BINANCE:ETHBTC</pre>\n" +
        "<pre>[2] BINANCE:ETHUSDT</pre>" +
        "<pre>[3] BINANCE:BTCUSDT (ML Kernelmode signal only)</pre>\n\n\n" +
        "<u><b>TRADING: MARKETS ENABLED</b></u>\n" +
        "<pre>[1] BINANCE:ETHUSDT</pre>",
        { parse_mode: 'HTML' }
    );
});

app.use(express.json());
app.use(express.static(__dirname + '/home/ubuntu/static', { dotfiles: 'allow' }));


// Express server listen to POST (BINANCE:ETHBTC)
let lorIndEthBtc;
let rsiIndEthBtc;
let emaIndEthBtc;
let lastPositionEthBtc = "insufficient interval";

app.post('/api/v1/ethbtc', function (req, res) {
    var tvPayload = req.body;
    const apiKey = tvPayload.apiKey;

    if (!apiKey || apiKey !== process.env.API_KEY) {
        res.status(401).json({error: 'unauthorised'});
    } else {
        if (tvPayload.lorInd !== undefined) {
            data1 = tvPayload.lorInd;
            lorIndEthBtc = data1;
        };

        if (tvPayload.rsiInd !== undefined) {
            data2 = tvPayload.rsiInd;
            rsiIndEthBtc = data2;
        };

        if (tvPayload.emaInd !== undefined) {
            data3 = tvPayload.emaInd;
            emaIndEthBtc = data3;
        };

        if (lorIndEthBtc === "long" && rsiIndEthBtc === "long" && emaIndEthBtc === "long") {
            lastPositionEthBtc = "LONG";

            tgbot.telegram.sendMessage(
                chatId,
                "<u>NEW SIGNAL DETECTED</u>\n\n" +
                "<b>Time (UTC): </b><pre>" + tvPayload.time + "</pre>\n" +
                "<b>Market: </b><pre>" + tvPayload.market + "</pre>\n" +
                "<b>Interval: </b><pre>" + tvPayload.interval + "</pre>\n\n" +
                "<b>Lorentzian Classification: </b><pre>" + lorIndEthBtc + "</pre>\n" +
                "<b>LagurreRSI Indicator: </b><pre>" + rsiIndEthBtc + "</pre>\n" +
                "<b>EMA200 Indicator (" + tvPayload.interval + "): </b><pre>" + emaIndEthBtc + "</pre>\n\n" +
                "<b>Recommendation: </b>" + "<u>LONG</u>\n\n\n" + 
                "Chart: " + "https://www.tradingview.com/chart/Irf7pn7D/?symbol=" + tvPayload.market + "&interval=" + tvPayload.interval,
                { parse_mode : 'HTML', disable_web_page_preview: true }
            );
            
            chartScreenshot(tvPayload.market, tvPayload.interval);
        }

        if (lorIndEthBtc === "short" && rsiIndEthBtc === "short" && emaIndEthBtc === "short") {
            lastPositionEthBtc = "SHORT";

            tgbot.telegram.sendMessage(
                chatId,
                "<u>NEW SIGNAL DETECTED</u>\n\n" +
                "<b>Time (UTC): </b><pre>" + tvPayload.time + "</pre>\n" +
                "<b>Market: </b><pre>" + tvPayload.market + "</pre>\n" +
                "<b>Interval: </b><pre>" + tvPayload.interval + "</pre>\n\n" +
                "<b>Lorentzian Classification: </b><pre>" + lorIndEthBtc + "</pre>\n" +
                "<b>LagurreRSI Indicator: </b><pre>" + rsiIndEthBtc + "</pre>\n" +
                "<b>EMA200 Indicator (" + tvPayload.interval + "): </b><pre>" + emaIndEthBtc + "</pre>\n\n" +
                "<b>Recommendation: </b>" + "<u>SHORT</u>\n\n\n" + 
                "Chart: " + "https://www.tradingview.com/chart/Irf7pn7D/?symbol=" + tvPayload.market + "&interval=" + tvPayload.interval,
                { parse_mode : 'HTML', disable_web_page_preview: true }
            );

            chartScreenshot(tvPayload.market, tvPayload.interval);
        }

        console.log(tvPayload)
        
        return res.status(200).json({"status": "success"});
    }
});


// Express server listen to POST (BINANCE:ETHUSDT)
let lorIndEthUsdt;
let rsiIndEthUsdt;
let emaIndEthUsdt;
let lastPositionEthUsdt = "insufficient interval";

app.post('/api/v1/ethusdt', function (req, res) {
    var tvPayload = req.body;
    const apiKey = tvPayload.apiKey;

    if (!apiKey || apiKey !== process.env.API_KEY) {
        res.status(401).json({error: 'unauthorised'});
    } else {
        if (tvPayload.lorInd !== undefined) {
            data1 = tvPayload.lorInd;
            lorIndEthUsdt = data1;
        };

        if (tvPayload.rsiInd !== undefined) {
            data2 = tvPayload.rsiInd;
            rsiIndEthUsdt = data2;
        };

        if (tvPayload.emaInd !== undefined) {
            data3 = tvPayload.emaInd;
            emaIndEthUsdt = data3;
        };

        if (lorIndEthUsdt === "long" && rsiIndEthUsdt === "long" && emaIndEthUsdt === "long") {
            lastPositionEthUsdt = "LONG";

            tgbot.telegram.sendMessage(
                chatId,
                "<u>NEW SIGNAL DETECTED</u>\n\n" +
                "<b>Time (UTC): </b><pre>" + tvPayload.time + "</pre>\n" +
                "<b>Market: </b><pre>" + tvPayload.market + "</pre>\n" +
                "<b>Interval: </b><pre>" + tvPayload.interval + "</pre>\n\n" +
                "<b>Lorentzian Classification: </b><pre>" + lorIndEthUsdt + "</pre>\n" +
                "<b>LagurreRSI Indicator: </b><pre>" + rsiIndEthUsdt + "</pre>\n" +
                "<b>EMA200 Indicator (" + tvPayload.interval + "): </b><pre>" + emaIndEthUsdt + "</pre>\n\n" +
                "<b>Recommendation: </b>" + "<u>LONG</u>\n\n\n" + 
                "Chart: " + "https://www.tradingview.com/chart/Irf7pn7D/?symbol=" + tvPayload.market + "&interval=" + tvPayload.interval,
                { parse_mode : 'HTML', disable_web_page_preview: true }
            );
            
            chartScreenshot(tvPayload.market, tvPayload.interval);
        }

        if (lorIndEthUsdt === "short" && rsiIndEthUsdt === "short" && emaIndEthUsdt === "short") {
            lastPositionEthUsdt = "SHORT";

            tgbot.telegram.sendMessage(
                chatId,
                "<u>NEW SIGNAL DETECTED</u>\n\n" +
                "<b>Time (UTC): </b><pre>" + tvPayload.time + "</pre>\n" +
                "<b>Market: </b><pre>" + tvPayload.market + "</pre>\n" +
                "<b>Interval: </b><pre>" + tvPayload.interval + "</pre>\n\n" +
                "<b>Lorentzian Classification: </b><pre>" + lorIndEthUsdt + "</pre>\n" +
                "<b>LagurreRSI Indicator: </b><pre>" + rsiIndEthUsdt + "</pre>\n" +
                "<b>EMA200 Indicator (" + tvPayload.interval + "): </b><pre>" + emaIndEthUsdt + "</pre>\n\n" +
                "<b>Recommendation: </b>" + "<u>SHORT</u>\n\n\n" + 
                "Chart: " + "https://www.tradingview.com/chart/Irf7pn7D/?symbol=" + tvPayload.market + "&interval=" + tvPayload.interval,
                { parse_mode : 'HTML', disable_web_page_preview: true }
            );

            chartScreenshot(tvPayload.market, tvPayload.interval);
        }

        console.log(tvPayload)
        
        return res.status(200).json({"status": "success"});
    }
});


// Express server listen to POST (BINANCE:BTCUSDT)
app.post('/api/v1/btcusdt', function (req, res) {
    var tvPayload = req.body;
    const apiKey = tvPayload.apiKey;

    if (!apiKey || apiKey !== process.env.API_KEY) {
        res.status(401).json({error: 'unauthorised'});
    } else {
        tgbot.telegram.sendMessage(
            chatId,
            "<u>NEW SIGNAL DETECTED: BTCUSDT Kernelmode</u>\n\n" +
            "<b>Time (UTC): </b><pre>" + tvPayload.time + "</pre>\n" +
            "<b>Market: </b><pre>" + tvPayload.market + "</pre>\n" +
            "<b>Interval: </b><pre>" + tvPayload.interval + "</pre>\n\n" +
            "<b>Closing Price: </b><pre>" + tvPayload.price + "</pre>\n" +
            "<b>Volume: </b><pre>" + tvPayload.volume + "</pre>\n\n" +
            "<b>Lorentzian Classification: </b><pre>" + tvPayload.lorInd + "</pre>\n\n" +
            "Chart: " + "https://www.tradingview.com/chart/Irf7pn7D/?symbol=" + tvPayload.market + "&interval=" + tvPayload.interval,
            { parse_mode : 'HTML', disable_web_page_preview: true }
        );
        
        chartSS(tvPayload.market, tvPayload.interval);

        console.log(tvPayload)
        
        return res.status(200).json({"status": "success"});
    }
});


// Screenshot function using Puppeteer
function sleep(ms) {
    return new Promise(res => {
        setTimeout(res, ms);
    })
};

async function chartScreenshot(market, interval) {
    puppeteer
    .launch({
        executablePath: '/usr/bin/chromium-browser',
        args: ["--no-sandbox", '--disable-gpu', '--headless'],
        defaultViewport: {
        width: 1920,
        height: 1080,
        }
    })
    .then(async (browser) => {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:73.0) Gecko/20100101 Firefox/73.0');
        await page.goto("https://www.tradingview.com/chart/Irf7pn7D/?symbol=" + market + "&interval=240");
        const element = await page.$("body > div.js-rootresizer__contents.layout-with-border-radius > div.layout__area--center > div > div.chart-container-border > div > table");
        await sleep(8500);
        await element.screenshot({ path: "screenshot.png" });
        await browser.close();
    })
    .then(() => {
        tgbot.telegram.sendPhoto(
            chatId, 
            { source: "./screenshot.png" }, 
            { caption: 'Chart Interval 4H. If you have a Tradingview Pro account, use the link above for correct intervals.' });
    });
}

async function chartSS(market, interval) {
    puppeteer
    .launch({
        executablePath: '/usr/bin/chromium-browser',
        args: ["--no-sandbox", '--disable-gpu', '--headless'],
        defaultViewport: {
        width: 1920,
        height: 1080,
        }
    })
    .then(async (browser) => {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:73.0) Gecko/20100101 Firefox/73.0');
        await page.goto("https://www.tradingview.com/chart/Irf7pn7D/?symbol=" + market + "&interval=" + interval);
        const element = await page.$("body > div.js-rootresizer__contents.layout-with-border-radius > div.layout__area--center > div > div.chart-container-border > div > table");
        await sleep(8500);
        await element.screenshot({ path: "screenshot.png" });
        await browser.close();
        console.log("https://www.tradingview.com/chart/Irf7pn7D/?symbol=" + market + "&interval=" + interval);
    })
    .then(() => {
        tgbot.telegram.sendPhoto(
            chatId, 
            { source: "./screenshot.png" }, 
            { caption: 'Chart Interval 4H. If you have a Tradingview Pro account, use the link above for correct intervals.' });
    });
}


// 4-hourly updates on indicator status.
setInterval(() => {
    tgbot.telegram.sendMessage(
        chatId,
        "<u>MARKET 4-HOURLY STATUS</u>\n\n" +
        "<b>Market: </b><pre>BINANCE:ETHBTC</pre>\n" +
        "<b>Interval: </b><pre>480</pre>\n\n" +
        "<b>Lorentzian Classification: </b><pre>" + lorIndEthBtc + "</pre>\n" +
        "<b>LagurreRSI Indicator: </b><pre>" + rsiIndEthBtc + "</pre>\n" +
        "<b>EMA200 Indicator (8H): </b><pre>" + emaIndEthBtc + "</pre>\n\n" +
        "<b>Last position: </b><pre>" + lastPositionEthBtc + "</pre>\n\n\n\n" +
        "<b>Market: </b><pre>BINANCE:ETHUSDT</pre>\n" +
        "<b>Interval: </b><pre>480</pre>\n\n" +
        "<b>Lorentzian Classification: </b><pre>" + lorIndEthUsdt + "</pre>\n" +
        "<b>LagurreRSI Indicator: </b><pre>" + rsiIndEthUsdt + "</pre>\n" +
        "<b>EMA200 Indicator (8H): </b><pre>" + emaIndEthUsdt + "</pre>\n\n" +
        "<b>Last position: </b><pre>" + lastPositionEthUsdt + "</pre>\n",
        { parse_mode : 'HTML', disable_web_page_preview: true }
    )
}, 14400000)


// Merge Project Midnight Planetarium trading code

// Telegram bot (@mdnt_plntrm_bot)
const tgbot2 = new Telegraf(process.env.TELEGRAM_TOKEN_2);
const tgChatId = process.env.TELEGRAM_CHATID;

// Instantiate exchange (Binance)
let binance = new ccxt.binance ({
	apiKey: process.env.BINANCE_APIKEY,
	'secret': process.env.BINANCE_SECRET,
	'enablerateLimit': true,
	'options': {
		'createMarketBuyOrderRequiresPrice': false
	}
});

// Uncomment to use Binance Testnet
// Generate testnet keys at https://testnet.binance.vision/
// binance.setSandboxMode (true);

// ETHUSDT Trade
app.post('/api/v1/trade/ethusdt', function (req, res) {
	let payload = req.body;
	let apiKey = payload.apiKey;

	if (!apiKey || apiKey !== process.env.APP_APIKEY) {
		res.status(401).json({error: 'unauthorised'});
	} else {
		if (payload.signal === "long") {
			(async () => {
				let symbol = "ETH/USDT";
				let usdtBal = await binance.fetchBalance ().then(res => {
					return res.free.USDT;
				});
				let ethPrice = await binance.fetchTicker ('ETH/USDT').then(res => {
					return res.last;
				});
				let ethAmount = (usdtBal * 0.95) / ethPrice;
				binance.createMarketBuyOrder(symbol, ethAmount).then(res => {
					tgbot2.telegram.sendMessage(
						tgChatId,
						"<u>TRADE EXECUTED</u>\n\n" +
						"<b>Market: </b><pre>" + res.symbol + "</pre>\n" +
						"<b>Type: </b><pre>" + res.info.type + "</pre>\n" +
						"<b>Side: </b><pre>" + res.info.side + "</pre>\n" +
						"<b>TradeID: </b><pre>" + res.clientOrderId + "</pre>\n" +
						"<b>Execution Timestamp: </b><pre>" + res.datetime + "</pre>\n" +
						"<b>Status: </b><pre>" + res.info.status + "</pre>\n" +
						"<b>Price: </b><pre>" + res.price + " USDT</pre>\n" +
						"<b>Quantity: </b><pre>" + res.filled + " ETH</pre>",
						{ parse_mode : 'HTML' }
					)
					binance.fetchBalance ().then(balances => {
						tgbot2.telegram.sendMessage(
							tgChatId,
							"<u>BALANCES UPDATE</u>\n\n" +
							"<b>ETH: </b><pre>" + balances.free.ETH + "</pre>\n" +
							"<b>USDT: </b><pre>" + balances.free.USDT + "</pre>",
							{ parse_mode : 'HTML' }
						)
					})
				});
			}) ();
		}

		if (payload.signal === "short") {
			(async () => {
				let symbol = "ETH/USDT";
				let ethAmount = await binance.fetchBalance ().then(res => {
					return res.free.ETH;
				});
				binance.createMarketSellOrder(symbol, ethAmount).then(res => {
					tgbot2.telegram.sendMessage(
						tgChatId,
						"<u>TRADE EXECUTED</u>\n\n" +
						"<b>Market: </b><pre>" + res.symbol + "</pre>\n" +
						"<b>Type: </b><pre>" + res.info.type + "</pre>\n" +
						"<b>Side: </b><pre>" + res.info.side + "</pre>\n" +
						"<b>TradeID: </b><pre>" + res.clientOrderId + "</pre>\n" +
						"<b>Execution Timestamp: </b><pre>" + res.datetime + "</pre>\n" +
						"<b>Status: </b><pre>" + res.info.status + "</pre>\n" +
						"<b>Price: </b><pre>" + res.price + " USDT</pre>\n" +
						"<b>Quantity: </b><pre>" + res.filled + " ETH</pre>",
						{ parse_mode : 'HTML' }
					)
					binance.fetchBalance ().then(balances => {
						tgbot2.telegram.sendMessage(
							tgChatId,
							"<u>BALANCES UPDATE</u>\n\n" +
							"<b>ETH: </b><pre>" + balances.free.ETH + "</pre>\n" +
							"<b>USDT: </b><pre>" + balances.free.USDT + "</pre>",
							{ parse_mode : 'HTML' }
						)
					})
				});
			}) ();
		}
	}
})
