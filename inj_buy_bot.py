import requests
import time
from web3 import Web3

# Telegram settings
TELEGRAM_TOKEN = '7725962673:AAG2x5qDK2rieCqtEgUEKd_61OnuVP_44gM'
GROUP_CHAT_ID = '1002026596327'  # Replace with your group chat ID

# Injective and Web3 setup
INFURA_URL = 'https://mainnet.infura.io/v3/91585181af2b447791902b13d86115d3'
w3 = Web3(Web3.HTTPProvider(INFURA_URL))

# Function to send messages to Telegram with buttons
def send_telegram_message(message):
    url = f'https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage'
    payload = {
        'chat_id': GROUP_CHAT_ID,
        'text': message,
        'parse_mode': 'HTML',
        'reply_markup': {
            'inline_keyboard': [
                [
                    {'text': 'View Transaction', 'url': 'https://explorer.injective.network/'},  # Replace with actual URL
                    {'text': 'Buy INJ', 'url': 'https://coinhall.org/injective/inj1efdrt4s78gffnntlqlhcctu3h0ndsd0nr86edc'}
                ]
            ]
        }
    }
    requests.post(url, json=payload)  # Notice the change to json=payload

# Function to monitor blockchain for INJ buys
def check_inj_buys():
    inj_token_address = "factory-inj1xtel2knkt8hmc9dnzpjz6kdmacgcfmlv5f308w-ninja"  # Correct address without colon

    latest_block = w3.eth.get_block('latest')

    for tx in latest_block['transactions']:
        transaction = w3.eth.get_transaction(tx)
        
        # Check if transaction involves buying INJ
        if transaction['to'] == inj_token_address:
            buyer = transaction['from']
            amount_inj = transaction['value'] / 10**18  # Converting from Wei to INJ (assuming 18 decimals)
            
            # Create message with inline buttons
            message = f"🚀 New INJ Buy!\nBuyer: <code>{buyer}</code>\nAmount: {amount_inj} INJ"
            send_telegram_message(message)

# Loop to check the blockchain every 30 seconds
while True:
    check_inj_buys()
    time.sleep(30)
