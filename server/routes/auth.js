const express = require('express');
const router = express.Router();

const { getClient, initClient } = require('../telegramClient');

router.get('/me', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No session provided' });
    }

    try {
        const session = authHeader.split(' ')[1];
        // For now, we reuse the existing client or init a new one if permitted.
        // Since getClient() expects global initialization, we might need to re-init if the session differs
        // or just use a new client instance for this check.
        // Ideally, we should check if the session is valid.

        // Initialize a temporary client to check this specific session
        const { TelegramClient } = require('telegram');
        const { StringSession } = require('telegram/sessions');

        // Use environment variables directly as they are available in this scope/process
        const client = new TelegramClient(
            new StringSession(session),
            parseInt(process.env.TELEGRAM_API_ID),
            process.env.TELEGRAM_API_HASH,
            { connectionRetries: 1 }
        );

        await client.connect(); // Connects to Telegram servers
        const user = await client.getMe();

        res.json({
            user: {
                id: user.id.toString(),
                firstName: user.firstName,
                username: user.username,
                phone: user.phone
            }
        });
        // We generally shouldn't keep this client connected if we are just checking /me in this simple architecture,
        // unless we want to replace the global client. 
        // For a single-user app, we might want to set this as the global client if it works?

    } catch (error) {
        console.error('Check auth error:', error);
        res.status(401).json({ error: 'Invalid session' });
    }
});

router.post('/send-code', async (req, res) => {
    const { phone } = req.body;
    try {
        const client = getClient();
        await client.connect();
        const { phoneCodeHash } = await client.sendCode(
            { apiId: parseInt(process.env.TELEGRAM_API_ID), apiHash: process.env.TELEGRAM_API_HASH },
            phone
        );
        res.json({ phoneCodeHash });
    } catch (error) {
        console.error('Send code error:', error);
        res.status(500).json({ message: error.message || 'Failed to send code' });
    }
});

router.post('/sign-in', async (req, res) => {
    const { phone, code, phoneCodeHash, password } = req.body;
    try {
        const client = getClient();
        const fs = require('fs');
        const debugInfo = `
Client Keys: ${Object.keys(client).join(', ')}
Client Prototype: ${Object.getPrototypeOf(client).constructor.name}
Type of signIn: ${typeof client.signIn}
Is Instance of TelegramClient: ${client instanceof require('telegram').TelegramClient}
`;
        fs.writeFileSync('debug_log.txt', debugInfo);

        await client.connect();

        await client.signInUser({
            apiId: parseInt(process.env.TELEGRAM_API_ID),
            apiHash: process.env.TELEGRAM_API_HASH
        }, {
            phoneNumber: phone,
            phoneCode: async () => code,
            password: async () => password || '',
            onError: (err) => {
                console.log(err);
                throw err;
            },
        });

        // Save session
        const session = client.session.save();

        // Persist session to file
        const sessionPath = require('path').join(__dirname, '../session.txt');
        fs.writeFileSync(sessionPath, session);
        console.log('Session saved to', sessionPath);

        // Return user info
        const user = await client.getMe();

        res.json({
            user: {
                id: user.id.toString(),
                firstName: user.firstName,
                username: user.username,
                phone: user.phone
            },
            session: session
        });
    } catch (error) {
        console.error('Sign in error:', error);
        if (error.message.includes('PASSWORD_NEEDED')) {
            return res.status(401).json({ error: 'SESSION_PASSWORD_NEEDED', message: '2FA Password needed' });
        }
        res.status(500).json({ message: error.message || 'Failed to sign in' });
    }
});

module.exports = router;
