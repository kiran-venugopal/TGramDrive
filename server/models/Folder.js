const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    driveId: {
        type: String, // 'me' or channel ID
        required: true,
    },
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Folder',
        default: null, // null means it's at the root of the drive
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

// Index to quickly fetch folders for a specific drive and parent
folderSchema.index({ driveId: 1, parentId: 1 });

module.exports = mongoose.model('Folder', folderSchema);
