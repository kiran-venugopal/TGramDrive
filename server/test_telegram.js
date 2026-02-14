const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
require('dotenv').config();

async function test() {
    console.log('Initializing client...');
    const client = new TelegramClient(new StringSession(''), 12345, 'randomhash', { connectionRetries: 1 });

    console.log('Client created.');
    console.log('Type of client:', typeof client);
    console.log('Is instance of TelegramClient:', client instanceof TelegramClient);
    console.log('client.signIn type:', typeof client.signIn);
    console.log('client.connect type:', typeof client.connect);
    console.log('Client keys:', Object.keys(client));
    console.log('Client prototype keys:', Object.getOwnPropertyNames(Object.getPrototypeOf(client)));
}

test().catch(console.error);
