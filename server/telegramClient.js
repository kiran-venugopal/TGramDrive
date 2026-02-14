const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Logger } = require('telegram/extensions');

let client = null;

const initClient = async (apiId, apiHash, sessionString) => {
    if (client) return client;

    const stringSession = new StringSession(sessionString || '');
    client = new TelegramClient(stringSession, parseInt(apiId), apiHash, {
        connectionRetries: 5,
    });

    // Set log level on the client instance
    client.setLogLevel('none');

    // Connect if session exists or just to be ready
    await client.connect();
    console.log('Telegram Client Connected');
    return client;
};

const getClient = () => {
    if (!client) {
        throw new Error('Telegram client not initialized. Call initClient first.');
    }
    return client;
};

module.exports = { initClient, getClient };
