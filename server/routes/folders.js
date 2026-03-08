const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Folder = require('../models/Folder');
const FileFolderMap = require('../models/FileFolderMap');
const ClientManager = require('../ClientManager');
const mongoose = require('mongoose');

// Apply auth middleware
router.use(protect);

const getUserClient = async (req, res) => {
    const client = await ClientManager.getClient(req.userId);
    if (!client) {
        res.status(401).json({ error: 'Session expired or invalid. Please login again.' });
        return null;
    }
    return client;
};

// Create a new folder
router.post('/', async (req, res) => {
    const { name, driveId, parentId, fileIds } = req.body;

    if (!name || !driveId) {
        return res.status(400).json({ message: 'Name and driveId are required' });
    }

    try {
        const folder = new Folder({
            name,
            driveId,
            parentId: parentId || null,
            userId: req.userId
        });

        const savedFolder = await folder.save();

        // If files were selected to be moved into this new folder immediately
        if (fileIds && Array.isArray(fileIds) && fileIds.length > 0) {
            const mappings = fileIds.map(fileId => ({
                messageId: fileId,
                driveId,
                folderId: savedFolder._id,
                userId: req.userId,
            }));

            // Upsert the mappings in case some files already belong to other folders
            const bulkOps = mappings.map(mapping => ({
                updateOne: {
                    filter: { messageId: mapping.messageId, driveId: mapping.driveId },
                    update: { $set: mapping },
                    upsert: true
                }
            }));

            await FileFolderMap.bulkWrite(bulkOps);
        }

        res.status(201).json(savedFolder);
    } catch (error) {
        console.error('Create folder error:', error);
        res.status(500).json({ message: error.message || 'Failed to create folder' });
    }
});

// Get folders for a drive (and optionally a specific parent folder)
router.get('/:driveId', async (req, res) => {
    const { driveId } = req.params;
    const { parentId } = req.query;

    try {
        const query = {
            driveId,
            userId: req.userId,
            parentId: parentId || null // Fetch root folders if parentId is not provided
        };

        const folders = await Folder.find(query).sort({ createdAt: -1 });
        res.json(folders);
    } catch (error) {
        console.error('Get folders error:', error);
        res.status(500).json({ message: 'Failed to fetch folders' });
    }
});

// Rename folder
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ message: 'Name is required' });
    }

    try {
        const folder = await Folder.findOneAndUpdate(
            { _id: id, userId: req.userId },
            { name },
            { new: true }
        );

        if (!folder) {
            return res.status(404).json({ message: 'Folder not found' });
        }

        res.json(folder);
    } catch (error) {
        console.error('Rename folder error:', error);
        res.status(500).json({ message: 'Failed to rename folder' });
    }
});

// Delete folder (Cascade deleting subfolders and files from Telegram)
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const client = await getUserClient(req, res);
        if (!client) return;

        // Recursively find all nested folders to delete
        const foldersToDelete = [new mongoose.Types.ObjectId(id)];

        async function getSubfolders(parentIds) {
            const subfolders = await Folder.find({ parentId: { $in: parentIds }, userId: req.userId });
            if (subfolders.length > 0) {
                const subIds = subfolders.map(f => f._id);
                foldersToDelete.push(...subIds);
                await getSubfolders(subIds);
            }
        }

        await getSubfolders([id]);

        // Find all file mappings for these folders
        const mappings = await FileFolderMap.find({ folderId: { $in: foldersToDelete }, userId: req.userId });

        if (mappings.length > 0) {
            // Group by driveId to batch delete from Telegram
            const messagesByDrive = {};
            mappings.forEach(m => {
                if (!messagesByDrive[m.driveId]) {
                    messagesByDrive[m.driveId] = [];
                }
                messagesByDrive[m.driveId].push(m.messageId);
            });

            // Delete from Telegram
            for (const [driveId, messageIds] of Object.entries(messagesByDrive)) {
                let entity = driveId === 'me' ? 'me' : driveId;
                await client.deleteMessages(entity, messageIds, { revoke: true });
            }

            // Delete from FileFolderMap
            await FileFolderMap.deleteMany({ folderId: { $in: foldersToDelete }, userId: req.userId });
        }

        // Delete the folders themselves
        await Folder.deleteMany({ _id: { $in: foldersToDelete }, userId: req.userId });

        res.json({ message: 'Folder and its contents deleted successfully' });
    } catch (error) {
        console.error('Delete folder error:', error);
        res.status(500).json({ message: error.message || 'Failed to delete folder' });
    }
});

// Move files into/out of folders
router.post('/move', async (req, res) => {
    const { fileIds, driveId, targetFolderId } = req.body;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0 || !driveId) {
        return res.status(400).json({ message: 'fileIds array and driveId are required' });
    }

    try {
        if (!targetFolderId) {
            // Moving to root: remove mapping entirely
            await FileFolderMap.deleteMany({
                messageId: { $in: fileIds },
                driveId,
                userId: req.userId
            });
        } else {
            // Moving into a folder: Upsert mapping
            const bulkOps = fileIds.map(fileId => ({
                updateOne: {
                    filter: { messageId: fileId, driveId, userId: req.userId },
                    update: { $set: { messageId: fileId, driveId, folderId: targetFolderId, userId: req.userId } },
                    upsert: true
                }
            }));
            await FileFolderMap.bulkWrite(bulkOps);
        }

        res.json({ message: 'Files moved successfully' });
    } catch (error) {
        console.error('Move files error:', error);
        res.status(500).json({ message: 'Failed to move files' });
    }
});

module.exports = router;
