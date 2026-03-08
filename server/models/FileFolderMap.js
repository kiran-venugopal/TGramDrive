const mongoose = require('mongoose');

const fileFolderMapSchema = new mongoose.Schema({
    messageId: {
        type: Number, // Telegram message ID
        required: true,
    },
    driveId: {
        type: String, // 'me' or channel ID
        required: true,
    },
    folderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Folder',
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Compound index to quickly find a specific file's mapping
fileFolderMapSchema.index({ messageId: 1, driveId: 1 }, { unique: true });

// Index to quickly fetch all files in a folder
fileFolderMapSchema.index({ folderId: 1, driveId: 1 });

module.exports = mongoose.model('FileFolderMap', fileFolderMapSchema);
