const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For AES, this is always 16
const SALT_LENGTH = 64; // Length of the salt
const TAG_LENGTH = 16; // GCM tag length

const getKey = () => {
    const keyHex = process.env.SESSION_ENCRYPTION_KEY;
    if (!keyHex) {
        throw new Error('SESSION_ENCRYPTION_KEY is not defined');
    }
    return Buffer.from(keyHex, 'hex');
};

const encrypt = (text) => {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getKey();

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

const decrypt = (text) => {
    const parts = text.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted text format');
        // Or handle legacy plain-text sessions here if transitioning existing users
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];
    const key = getKey();

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
};

module.exports = { encrypt, decrypt };
