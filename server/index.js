require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/files', require('./routes/files'));

// Keep process alive hack for gram.js
setInterval(() => { }, 1000 * 60 * 60);

// Basic health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', server_time: new Date().toISOString() });
});

app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);

    // Initialize Telegram Client if env vars are present
    if (process.env.TELEGRAM_API_ID && process.env.TELEGRAM_API_HASH) {
        try {
            const { initClient } = require('./telegramClient');
            const fs = require('fs');
            const path = require('path');

            // Path to session file - robustly resolve to server root
            const sessionPath = path.join(__dirname, 'session.txt');

            if (fs.existsSync(sessionPath)) {
                sessionString = fs.readFileSync(sessionPath, 'utf8');
                console.log('Loaded session from session.txt');
            } else {
                console.log('No session file found at', sessionPath);
            }

            await initClient(
                process.env.TELEGRAM_API_ID,
                process.env.TELEGRAM_API_HASH,
                sessionString
            );
            console.log('Telegram client initialized');
        } catch (error) {
            console.error('Failed to initialize Telegram client:', error);
        }
    } else {
        console.warn('TELEGRAM_API_ID and TELEGRAM_API_HASH not set. Telegram features will not work.');
    }
});
