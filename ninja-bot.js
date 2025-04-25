const { Telegraf } = require('telegraf');
require('dotenv').config();
const axios = require('axios');

const bot = new Telegraf(process.env.BOT_TOKEN); // Use .env for safety
const groupChat = process.env.GROUP_CHAT_ID;     // Also put this in your .env
const NINJA_CODE = process.env.NINJA_CODE;

async function getNinjaPriceAndMarketCap() {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
      params: {
        vs_currency: 'usd',
        ids: 'dog-wif-nunchucks', // Confirm this ID
      }
    });
    const data = response.data[0];
    return {
      price: data.current_price,
      priceChange24h: data.price_change_percentage_24h,
      marketCap: data.market_cap
    };
  } catch (error) {
    console.log('Oops! Couldn’t get price:', error.message);
    return { price: 'Unknown', priceChange24h: 'Unknown', marketCap: 'Unknown' };
  }
}

// Check the toy store for Ninja toy buys
async function checkForBuys() {
  try {
    const response = await axios.get('https://lcd.injective.network/cosmos/tx/v1beta1/txs', {
      params: {
        limit: 10
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
console.log('Robot is watching for Ninja toy buys!');
