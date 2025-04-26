const { Telegraf } = require('telegraf');
require('dotenv').config();
const axios = require('axios');

const bot = new Telegraf(process.env.BOT_TOKEN);
const groupChat = process.env.GROUP_CHAT_ID; // -1002619994667
const NINJA_CODE = process.env.NINJA_CODE;   // factory/inj1xtel2knkt8hmc9dnzpjz6kdmacgcfmlv5f308w/ninja
const MARKET_ID = '0xdf9317eac1739a23bc385e264afde5d480c0b3d2322660b5efd206071d4e70b7';
const SUBGRAPH_URL = 'https://gateway.thegraph.com/api/subgraphs/id/5K9VPUj4gGnZdRZhzbuLHqADDF4QcSwig84hGLTMC595'; // Replace with actual URL

// Track the last processed trade timestamp to avoid duplicates
let lastProcessedTimestamp = 0;

// Fetch NINJA price from CoinGecko
async function getNinjaPriceAndMarketCap() {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
      params: { vs_currency: 'usd', ids: 'dog-wif-nunchucks' }
    });
    const data = response.data[0];
    if (!data) throw new Error('No price data');
    return {
      price: data.current_price || 'Unknown',
      priceChange24h: data.price_change_percentage_24h || 'Unknown',
      marketCap: data.market_cap || 'Unknown'
    };
  } catch (error) {
    console.log('Price Error:', error.message);
    return { price: 'Unknown', priceChange24h: 'Unknown', marketCap: 'Unknown' };
  }
}

// Check for NINJA buys using The Graph subgraph
async function checkForBuys() {
  try {
    const query = `
      {
        trades(where: {marketId: "${MARKET_ID}", isBuy: true, timestamp_gt: ${lastProcessedTimestamp}}, orderBy: timestamp, orderDirection: asc, first: 10) {
          id
          quantity
          price
          buyer
          timestamp
        }
      }
    `;
    const response = await axios.post(SUBGRAPH_URL, { query });

    const trades = response.data.data.trades || [];
    if (!trades.length) {
      console.log('No new trades found');
      return;
    }

    const { price, priceChange24h, marketCap } = await getNinjaPriceAndMarketCap();

    for (const trade of trades) {
      lastProcessedTimestamp = parseInt(trade.timestamp);

      const ninjaBought = trade.quantity || 'Unknown';
      const injSpent = trade.quantity && trade.price ? (parseFloat(trade.quantity) * parseFloat(trade.price)).toString() : 'Unknown';
      const buyer = trade.buyer || 'Unknown';
      const buyerShort = buyer.slice(0, 4) + '...' + buyer.slice(-3);

      const usdValue = ninjaBought !== 'Unknown' && price !== 'Unknown' ? (parseFloat(ninjaBought) / 1e18 * price).toFixed(2) : 'Unknown';

      const message = `**NEW $NINJA BUY!**\n\n` +
                      `💰💰 New NINJA Buy 💰💰\n` +
                      `Bought: ${(parseFloat(ninjaBought) / 1e18).toFixed(2)} NINJA ($${usdValue})\n` +
                      `Spent: ${(parseFloat(injSpent) / 1e18).toFixed(2)} INJ\n` +
                      `Buyer: ${buyerShort} via Hallswap\n\n` +
                      `Price: $${price} (24h: ${priceChange24h}%)\n` +
                      `Market Cap: $${marketCap.toLocaleString()}\n\n` +
                      `Twitter | Web`;

      await bot.telegram.sendAnimation(groupChat, 'https://imgur.com/a/HN21cmT', {
        caption: message,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'Twitter', url: 'https://x.com/dogwifnunchucks' },
              { text: 'Web', url: 'https://dogwifnunchucks.com' }
            ],
            [
              { text: 'Buy 💰', url: 'https://hallswap.com' },
              { text: 'Chart 📈', url: 'https://dexscreener.com/injective/ninja' }
            ]
          ]
        }
      });
    }
  } catch (error) {
    console.log('Error:', error.message);
  }
}

// Check every 2 minutes
setInterval(checkForBuys, 120000);

// Start the bot
bot.launch();
bot.telegram.sendMessage(groupChat, "Hi! I’m your Ninja toy robot. I’m starting now! 🐶");
console.log('Group Chat ID:', groupChat);
console.log('Robot is watching for Ninja toy buys!');

// Check the toy store for Ninja toy buys
/*async function checkForBuys() {
  try {
    const response = await axios.get('https://lcd.injective.network/cosmos/tx/v1beta1/txs', {
      params: {
        limit: 10,
        events:`transfer.recipient='${NINJA_CODE}'`
      }
    });

    if (response.status !== 200) {
      throw new Error(`Unexpected response status: ${response.status}`);
    }

    const buys = response.data.txs;

    if (!buys || buys.length === 0) {
      console.log('No transactions found');
      return;
    }

    const { price, priceChange24h, marketCap } = await getNinjaPriceAndMarketCap();

    for (const buy of buys) {
      const ninjaTransaction = buy.messages?.find(msg => msg['@type'] === '/cosmos.bank.v1beta1.MsgSend' &&
        msg.amount?.some(amt => amt.denom === 'ninja'));

      if (ninjaTransaction) {
        const ninjaBought = ninjaTransaction.amount.find(amt => amt.denom === 'ninja')?.amount / 1e6 || 'Unknown';
        const injSpent = ninjaTransaction.amount.find(amt => amt.denom === 'inj')?.amount / 1e18 || 'Unknown';
        const buyer = ninjaTransaction?.from_address?.slice(0, 4) + '...' + ninjaTransaction?.from_address?.slice(-3) || 'Unknown';
        const usdValue = ninjaBought !== 'Unknown' && price !== 'Unknown' ? (ninjaBought * price).toFixed(2) : 'Unknown';

        const message = `**NEW $NINJA BUY!**\n\n` +
                        `💰💰 New NINJA Buy 💰💰\n` +
                        `Bought: ${ninjaBought} NINJA ($${usdValue})\n` +
                        `Spent: ${injSpent} INJ\n` +
                        `Buyer: ${buyer} via Hallswap\n\n` +
                        `Price: $${price} (24h: ${priceChange24h}%)\n` +
                        `Market Cap: $${marketCap.toLocaleString()}\n\n` +
                        `Twitter | Web`;

        await bot.telegram.sendPhoto(groupChat, 'https://imgur.com/a/HN21cmT', {
          caption: message,
          parse_mode: 'Markdown', // For bold text
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'Twitter', url: 'https://x.com/dogwifnunchucks' },
                { text: 'Web', url: 'https://dogwifnunchucks.com' }
              ],
              [
                { text: 'Buy 💰', url: 'https://hallswap.com' },
                { text: 'Chart 📈', url: 'https://dexscreener.com/injective/ninja' }
              ]
            ]
          }
        });
      }
    }
  } catch (error) {
    console.log('Oops! The toy store didn’t answer:', error.message);
    if (error.response) {
      console.log('API Error:', error.response.data);
    } else if (error.request) {
      console.log('No response from the server:', error.request);
    } else {
      console.log('Request setup error:', error.message);
    }
    
    // Retry after 10 seconds if needed
    console.log('Retrying in 10 seconds...');
    setTimeout(checkForBuys, 10000); // Retry the check
  }
}

// Check every 10 seconds
setInterval(checkForBuys, 10000);

// Start the robot
bot.launch();
console.log('Robot is watching for Ninja toy buys!');*/
