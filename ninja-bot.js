const { Telegraf } = require('telegraf');
require('dotenv').config();
const axios = require('axios');

const bot = new Telegraf(process.env.BOT_TOKEN); // Use .env for safety
const groupChat = process.env.GROUP_CHAT_ID;     // Also put this in your .env
const NINJA_CODE = process.env.NINJA_CODE;

const seenTxs = new Set(); // To avoid duplicate alerts

async function checkForBuys() {
  try {
    const response = await axios.get('https://lcd.injective.network/cosmos/tx/v1beta1/txs?limit=10');
    const txs = response.data.txs;

    for (const tx of txs) {
      const txHash = tx?.hash;
      if (seenTxs.has(txHash)) continue; // Skip already-seen txs

      const rawLog = tx?.logs?.[0]?.events?.map(e => JSON.stringify(e)).join(" ") || '';
      if (rawLog.includes(NINJA_CODE)) {
        const msg = `🟢 Someone bought a Ninja toy!\nTx Hash: ${txHash}\nCheck: https://explorer.injective.network/transaction/${txHash}`;
        await bot.telegram.sendMessage(groupChat, msg);
        seenTxs.add(txHash);
      }
    }
  } catch (error) {
    console.error('Error fetching transactions:', error.message);
  }
}

setInterval(checkForBuys, 10000);
bot.launch();
console.log('🤖 Robot is watching for Ninja toy buys!');
