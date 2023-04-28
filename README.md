# Tradingview MP Auto-trader Bot

The objective of this bot is to somewhat automate a / many trading strategy(s). A Tradingview Pro account is required; setting up Tradingview webhook alerts is assumed and will not be covered in-depth. This bot will take signals from Tradingview alerts (webhook) to create orders on your exchange / broker. The author is using Binance spot markets; please change accordingly to your needs.

Steps:

- Set up Tradingview indicators and alerts (requires Pro account, or higher).
- Create a Telegram bot via @botfather (obtain bot APIKEYs).
- Create a Telegram channel (obtain CHATID).
- Use Certbot to manually generate SSL certs and add to express server.

Note that this project was originally to generate trading position recommendations to a Telegram group / channel. It has been merged with another project to auto-trade based on the signals receive. Parts of this instructions may not be accurate and is being updated.


## Setting up Tradingview webhook
After setting up your indicators, set up Tradingview alert webhook messages similar to the below (json formatted):

    {
        "apiKey": "<YOUR_OWN_KEY>",
        "market": "{{exchange}}:{{ticker}}",
        "interval": "{{interval}}",
        "rsiInd": "short",
        "time": "{{timenow}}"
    }

`apikey` can be any value. You can generate this by hashing something, e.g. a password you know, or by using `openssl`.

    # OpenSSL Method
    openssl rand -base64 20 # 20-char length key

    # Hash Method
    echo "YoUr_p4ssw0rd!" | md5sum

The `apikey` value will be used to authenticate Tradingview's webhook messages against the Express API server to prevent unauthorised interaction. Replace `<YOUR_OWN_KEY>` in the above example JSON message when setting up Tradingview alerts, as well as `API_KEY` field in your `.env` file.

Also make sure that *rsiInd* and its corresponding value *short* are replaced according to the indicator the alert is set for, as well as the intended indicator signal, i.e. long / short / open / close.


## Install tradingview-informer package
Install pre-requisites:

    sudo apt update
    sudo apt install curl git
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install nodejs

Once complete, verify the version:

    node -v
    v18.14.0  # Your version might be newer.

Check NPM version:

    npm -v
    9.3.1  # Your version might be newer.

Install node modules:

    git clone https://github.com/feradoxin/tradingview-informer.git
    npm install
    
In the main folder:

    mv .env.sample .env
    
Populate the .env file with your Telegram bot token (from botfather), chat ID (see below), and your own generated APP_API_KEY. Also input your Binance API keys. If using Binanace testnets, enable sandbox mode by uncommenting `// binance.setSandboxMode (true);`.

To get your chat ID, message your bot with /start to initialise the bot, then add your bot to your group / channel. Send a message to the group / channel. Go to https://api.telegram.org/bot[YOUR_BOT_TOKEN]/getUpdates (replace [YOUR_BOT_TOKEN] including the block brackets) and look for the message you just sent. Within the JSON object, you will see your chat ID. In the example below, the value "-10.....7" is the channel's ID. Direct chats will be a positive number, while groups and channels are negative.

<img src="img\chatID.png" alt="ChatIDJson" title="Telegram Bot Example Json">


### Install `puppeteer` pre-requisites (Deprecated)
Install `chromium-browser`:

    sudo apt update
    sudo apt install chromium-browser


Install `chromium-browser` dependencies:
    
    sudo apt install ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils


### Running script in background
Copy the system service file to systemd and enable the service.

    sudo cp ./tv-inform-app.service /etc/systemd/system/tv-inform-app.service
    sudo systemctl enable tv-inform-app.service
    sudo systemctl start tv-inform-app.service


If everything has been configured correctly, you will start receiving updates on the selected Telegram chat / group / channel. If not:

1. Check `tv-inform-app.service` file if the locations are correct.

2. Check if you have installed Certbot and obtained your SSL certs. This step is not covered in this README (search "certbot ssl express" for guides). `certbot-express.js` script and `.well-known` folder are included in this package.

3. Make sure the system / instance you are running this on has at least 1 GiB of RAM. `puppeteer` takes up quite a bit of memory when scraping for chart images. Insufficient memory can show up as "navigation timeout" errors.

4. If puppeteer still fails to scrape, you might be blocked / throttled due to a scraper being detected. Try changing the user-agent inside the `chartScreenshot()` function.

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:73.0) Gecko/20100101 Firefox/73.0')

## License

MIT License

Copyright (c) 2022 Sam Wong (@feradoxin)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


## Disclaimer

This code deals with trading on financial and/or cryptocurrency market(s). Profitability is not guaranteed and using this without advanced financial knowledge will result in losses. The author recommends that you do not allow this bot to trade more than you are willing to entirely lose. Additionally, you should set up your signals properly on Tradingview and modify the provided code accordingly to handle the signals generated.