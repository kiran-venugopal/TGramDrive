const jwt = require('jsonwebtoken');

const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    } else if (req.query && req.query.token) {
        // Support token via query parameter for external players (e.g., VLC)
        token = req.query.token;
        req._isQueryToken = true;
    }

    if (!token) {
        return res.status(401).json({ error: 'Not authorized, no token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.id;

        // If token came from query param and has a restricted scope, enforce it
        if (req._isQueryToken && decoded.scope === 'stream') {
            // Only allow file view/stream endpoints
            if (!req.path.startsWith('/view/')) {
                return res.status(403).json({ error: 'Stream token can only be used for viewing files' });
            }
        }

        next();
    } catch (error) {
        console.error('JWT Error:', error);
        res.status(401).json({ error: 'Not authorized, token failed' });
    }
};

module.exports = { protect };
