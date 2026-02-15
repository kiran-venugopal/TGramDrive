require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to Database
connectDB();

app.use(cors({
    origin: true, // Allow all origins (or specify your frontend URL)
    credentials: true // Allow cookies
}));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/files', require('./routes/files'));

// Serve static files from the React app
const path = require('path');
app.use(express.static(path.join(__dirname, '../client/dist')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get(/.*/, (req, res) => {
    // Check if request is for API
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ message: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Keep process alive hack for gram.js
setInterval(() => { }, 1000 * 60 * 60);

// Basic health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', server_time: new Date().toISOString() });
});

const startServer = async () => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
};

startServer();
