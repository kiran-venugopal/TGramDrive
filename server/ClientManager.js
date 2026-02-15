const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const User = require('./models/User');
const { decrypt } = require('./utils/encryption');

class ClientManager {
    constructor() {
        this.clients = new Map(); // userId -> client
    }

    // removed misplaced import
    async getClient(userId) {
        if (this.clients.has(userId)) {
            const client = this.clients.get(userId);
            if (!client.connected) {
                await client.connect();
            }
            return client;
        }

        // If not in memory, try to load from DB
        const user = await User.findById(userId);
        if (!user || !user.sessionString) {
            return null;
        }

        let sessionString = user.sessionString;
        try {
            // Try to decrypt. If it fails (legacy plain text), use as is or handle error.
            // Since we are just starting, we can assume all new sessions are encrypted.
            // But for robustness, we can check if it looks encrypted (contains 2 colons).
            if (sessionString.split(':').length === 3) {
                sessionString = decrypt(sessionString);
            }
        } catch (e) {
            console.warn(`Failed to decrypt session for user ${userId}, trying as plain text. Error: ${e.message}`);
        }

        const client = await this.initClient(sessionString, userId);
        return client;
    }

    async initClient(sessionString, userId) {
        // Use global env vars for now, or per-user if supported later
        const apiId = parseInt(process.env.TELEGRAM_API_ID);
        const apiHash = process.env.TELEGRAM_API_HASH;

        const client = new TelegramClient(
            new StringSession(sessionString),
            apiId,
            apiHash,
            { connectionRetries: 5 }
        );

        // Quiet logger
        client.setLogLevel('none');

        await client.connect();

        if (userId) {
            this.clients.set(userId.toString(), client);
        }

        return client;
    }

    addClient(userId, client) {
        this.clients.set(userId.toString(), client);
    }

    removeClient(userId) {
        const client = this.clients.get(userId.toString());
        if (client) {
            client.disconnect();
            this.clients.delete(userId.toString());
        }
    }
}

// Singleton instance
module.exports = new ClientManager();
