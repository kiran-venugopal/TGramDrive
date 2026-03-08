const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const ClientManager = require('../ClientManager');
const mimeLib = require('mime');
const mime = mimeLib.default || mimeLib;
const bigInt = require('big-integer');
const multer = require('multer');
const os = require('os');
const fs = require('fs');
const path = require('path');
const FileFolderMap = require('../models/FileFolderMap');

// Helper to handle BigInt serialization
const serialize = (obj) => {
    return JSON.parse(JSON.stringify(obj, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));
};

// Apply auth middleware to all routes
router.use(protect);

// Helper to get client safely
const getUserClient = async (req, res) => {
    const client = await ClientManager.getClient(req.userId);
    if (!client) {
        res.status(401).json({ error: 'Session expired or invalid, please login again' });
        return null;
    }
    return client;
};

router.get('/drives', async (req, res) => {
    try {
        const client = await getUserClient(req, res);
        if (!client) return;

        const { limit = 20, offsetDate, offsetId, offsetPeerId, search } = req.query;
        const { Api } = require('telegram');

        let drives = [];
        let nextOffset = {};

        // Always include 'Saved Messages' at the top of the first page/default view
        if ((!offsetDate && !search) || (search && 'saved messages'.includes(search.toLowerCase()))) {
            drives.push({ id: 'me', name: 'Saved Messages', type: 'saved' });
        }

        if (search) {
            // Search channels/chats
            const results = await client.invoke(new Api.contacts.Search({
                q: search,
                limit: parseInt(limit),
            }));

            // results.chats contains the matching channels/groups
            const chats = results.chats || [];

            for (const chat of chats) {
                if (chat.className === 'Channel' || chat.className === 'Chat') {
                    drives.push({
                        id: chat.id.toString(),
                        name: chat.title,
                        type: chat.className === 'Channel' && (chat.broadcast || chat.megagroup) ? 'channel' : 'group'
                    });
                }
            }
        } else {
            // Paginated list of dialogs
            const options = {
                limit: parseInt(limit),
            };

            if (offsetDate) options.offsetDate = parseInt(offsetDate);
            if (offsetId) options.offsetId = parseInt(offsetId);

            const dialogs = await client.getDialogs(options);

            for (const d of dialogs) {
                if (d.isChannel || d.isGroup) {
                    drives.push({
                        id: d.id.toString(),
                        name: d.title,
                        type: d.isChannel ? 'channel' : 'group'
                    });
                }
            }

            if (dialogs.length > 0) {
                const last = dialogs[dialogs.length - 1];
                nextOffset = {
                    offsetDate: last.date,
                    offsetId: last.message ? last.message.id : 0, // Top message ID (32-bit), not Peer ID
                };
            }
        }

        // Remove duplicates if Saved Messages was added and also returned by search/dialogs
        const uniqueDrives = Array.from(new Map(drives.map(item => [item.id, item])).values());

        res.json(serialize({
            drives: uniqueDrives,
            nextOffset: Object.keys(nextOffset).length > 0 ? nextOffset : null
        }));
    } catch (error) {
        console.error('Get drives error:', error);
        res.status(500).json({ message: error.message || 'Failed to get drives' });
    }
});

router.get('/:driveId', async (req, res) => {
    const { driveId } = req.params;
    const { limit = 20, offsetId, search, folderId } = req.query;

    try {
        const client = await getUserClient(req, res);
        if (!client) return;

        let entity = driveId === 'me' ? 'me' : driveId;
        const targetLimit = parseInt(limit);
        let nextOffsetId = offsetId ? parseInt(offsetId) : null;
        let files = [];

        // Helper function to parse message into File object
        const parseMessage = (msg) => {
            if (!msg || !msg.media) return null;

            let id = msg.id;
            let date = msg.date;
            let size = 0;
            let fileName = 'Unknown';
            let mimeType = 'application/octet-stream';
            let hasThumbnail = false;

            if (msg.media.className === 'MessageMediaDocument' && msg.media.document) {
                const doc = msg.media.document;
                size = doc.size;
                mimeType = doc.mimeType;

                const attr = doc.attributes.find(a => a.className === 'DocumentAttributeFilename');
                if (attr) {
                    fileName = attr.fileName;
                } else {
                    const audioAttr = doc.attributes.find(a => a.className === 'DocumentAttributeAudio');
                    if (audioAttr) {
                        const title = audioAttr.title || 'Unknown Title';
                        const performer = audioAttr.performer || 'Unknown Artist';
                        fileName = `${performer} - ${title}`;
                        if (!fileName.includes('.')) fileName += `.${mime.getExtension(mimeType) || 'mp3'}`;
                    } else if (doc.attributes.some(a => a.className === 'DocumentAttributeVideo')) {
                        fileName = `video_${id}.${mime.getExtension(mimeType) || 'mp4'}`;
                    } else {
                        fileName = `file_${id}.${mime.getExtension(mimeType) || 'bin'}`;
                    }
                }
                hasThumbnail = !!(doc.thumbs && doc.thumbs.length > 0);
            } else if (msg.media.className === 'MessageMediaPhoto' && msg.media.photo) {
                const photo = msg.media.photo;
                let largest = photo.sizes[photo.sizes.length - 1];
                size = largest.size || 0;
                mimeType = 'image/jpeg';
                fileName = `photo_${id}.jpg`;
                hasThumbnail = true;
            } else {
                return null;
            }

            let uploader = 'Unknown';
            if (msg.sender) {
                if (msg.sender.username) uploader = `@${msg.sender.username}`;
                else if (msg.sender.firstName) uploader = msg.sender.firstName + (msg.sender.lastName ? ` ${msg.sender.lastName}` : '');
                else if (msg.sender.title) uploader = msg.sender.title;
            }

            return { id, fileName, size, mimeType, date, driveId, hasThumbnail, uploader };
        };

        if (folderId && !search) {
            // IF IN A SPECIFIC FOLDER: Fetch mappings, then exact messages
            const query = { folderId, driveId, userId: req.userId };
            if (nextOffsetId) {
                query.messageId = { $lt: nextOffsetId };
            }

            const mappings = await FileFolderMap.find(query)
                .sort({ messageId: -1 })
                .limit(targetLimit);

            if (mappings.length > 0) {
                const messageIds = mappings.map(m => m.messageId);
                const messages = await client.getMessages(entity, { ids: messageIds });

                // Keep the fetched messages in the exact order requested
                const fetchedMap = new Map();
                for (const msg of messages) {
                    if (msg) fetchedMap.set(msg.id, msg);
                }

                for (const msgId of messageIds) {
                    if (fetchedMap.has(msgId)) {
                        const parsed = parseMessage(fetchedMap.get(msgId));
                        if (parsed) files.push(parsed);
                    }
                }

                // If we got as many mappings as the limit, there might be more
                if (mappings.length === targetLimit) {
                    nextOffsetId = mappings[mappings.length - 1].messageId;
                } else {
                    nextOffsetId = null;
                }
            } else {
                nextOffsetId = null;
            }

        } else {
            // IF AT ROOT (OR SEARCHING): Fetch normally, but exclude mapped files if not searching globally
            // A search might transcend folders, or we can choose to restrict it to root.
            // Let's exclude mapped files from root view.

            // Get all mapped files in this drive to ignore them
            const mappedMsgSet = new Set(await FileFolderMap.find({ driveId, userId: req.userId }).distinct('messageId'));

            // Pagination Loop
            let maxLoops = 10; // Prevent infinite loops if there are huge gaps

            while (files.length < targetLimit && maxLoops > 0) {
                const iterOptions = { limit: 50 }; // Fetch in chunks
                if (nextOffsetId) iterOptions.offsetId = nextOffsetId;
                if (search) iterOptions.search = search;

                const messages = await client.getMessages(entity, iterOptions);
                if (messages.length === 0) {
                    nextOffsetId = null; // No more messages
                    break;
                }

                for (const msg of messages) {
                    if (files.length >= targetLimit) break;

                    // IF AT ROOT, ignore files that are inside folders
                    if (!search && mappedMsgSet.has(msg.id)) continue;

                    const parsed = parseMessage(msg);
                    if (parsed) files.push(parsed);
                }

                nextOffsetId = messages[messages.length - 1].id;
                maxLoops--;
            }
        }

        res.json(serialize({
            files,
            nextOffsetId: nextOffsetId || null
        }));
    } catch (error) {
        console.error('Get files error:', error);
        res.status(500).json({ message: error.message || 'Failed to get files' });
    }
});

router.get('/download/:fileId', async (req, res) => {
    const { fileId } = req.params;
    const { driveId } = req.query;

    if (!driveId) {
        return res.status(400).json({ message: 'Missing driveId query parameter' });
    }

    try {
        const client = await getUserClient(req, res);
        if (!client) return;

        let entity = driveId === 'me' ? 'me' : driveId;

        // Fetch specific message to get media
        const messages = await client.getMessages(entity, { ids: [parseInt(fileId)] });
        const msg = messages[0];

        if (!msg || !msg.media) {
            return res.status(404).json({ message: 'File not found' });
        }

        console.log(`Downloading file ${fileId} from ${driveId}...`);

        let fileName = `file_${fileId}`;
        let mimeType = 'application/octet-stream';
        let fileSize = 0;

        if (msg.media.document) {
            const doc = msg.media.document;
            mimeType = doc.mimeType;
            fileSize = doc.size;
            const attr = doc.attributes.find(a => a.className === 'DocumentAttributeFilename');
            if (attr) fileName = attr.fileName;

            // Check extension
            if (!fileName.includes('.')) {
                const ext = mime.getExtension(mimeType);
                if (ext) fileName += `.${ext}`;
            }
        } else if (msg.media.photo) {
            mimeType = 'image/jpeg';
            fileName = `photo_${fileId}.jpg`;
            const photo = msg.media.photo;
            if (photo.sizes && photo.sizes.length > 0) {
                const largest = photo.sizes[photo.sizes.length - 1];
                fileSize = largest.size;
            }
        }

        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', mimeType);
        if (fileSize) {
            res.setHeader('Content-Length', fileSize);
        }

        // Stream the file
        const chunks = client.iterDownload({
            file: msg.media,
            requestSize: 1024 * 1024, // 1MB chunks
        });

        for await (const chunk of chunks) {
            res.write(chunk);
        }
        res.end();

    } catch (error) {
        console.error('Download error:', error);
        if (!res.headersSent) {
            res.status(500).json({ message: error.message || 'Failed to download file' });
        } else {
            res.end();
        }
    }
});

router.get('/thumbnail/:fileId', async (req, res) => {
    const { fileId } = req.params;
    const { driveId } = req.query;

    if (!driveId) {
        return res.status(400).json({ message: 'Missing driveId query parameter' });
    }

    try {
        const client = await getUserClient(req, res);
        if (!client) return;

        let entity = driveId === 'me' ? 'me' : driveId;

        const messages = await client.getMessages(entity, { ids: [parseInt(fileId)] });
        const msg = messages[0];

        if (!msg || !msg.media) {
            return res.status(404).json({ message: 'File not found' });
        }

        // Find best thumbnail size (closest to 200x200)
        let thumbSize = 'm';

        // Handle Photos
        if (msg.media.className === 'MessageMediaPhoto') {
            thumbSize = 'm';
        } else if (msg.media.document && msg.media.document.thumbs) {
            const availableTypes = msg.media.document.thumbs.map(t => t.type);
            if (!availableTypes.includes('m')) {
                if (availableTypes.includes('s')) thumbSize = 's';
                else if (availableTypes.includes('x')) thumbSize = 'x';
                else if (availableTypes.length > 0) thumbSize = availableTypes[0];
            }
        }

        const buffer = await client.downloadMedia(msg, {
            workers: 1,
            thumb: thumbSize
        });

        if (!buffer || buffer.length === 0) {
            return res.status(404).json({ message: 'Thumbnail not found' });
        }

        res.setHeader('Content-Type', 'image/jpeg'); // Thumbnails are usually JPEGs
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.send(buffer);

    } catch (error) {
        console.error('Thumbnail download error:', error);
        res.status(500).json({ message: error.message || 'Failed to download thumbnail' });
    }
});

router.get('/view/:fileId', async (req, res) => {
    const { fileId } = req.params;
    const { driveId } = req.query;

    if (!driveId) {
        return res.status(400).json({ message: 'Missing driveId query parameter' });
    }

    try {
        const client = await getUserClient(req, res);
        if (!client) return;

        let entity = driveId === 'me' ? 'me' : driveId;

        const messages = await client.getMessages(entity, { ids: [parseInt(fileId)] });
        const msg = messages[0];

        if (!msg || !msg.media) {
            return res.status(404).json({ message: 'File not found' });
        }

        console.log(`Viewing file ${fileId} from ${driveId}...`);

        let mimeType = 'application/octet-stream';
        let fileSize = 0;

        if (msg.media.document) {
            mimeType = msg.media.document.mimeType;
            fileSize = msg.media.document.size;
        } else if (msg.media.photo) {
            mimeType = 'image/jpeg';
        }

        // Handle Range Requests (Video Streaming)
        const range = req.headers.range;
        if (range && fileSize) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;

            res.status(206);
            res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
            res.setHeader('Accept-Ranges', 'bytes');
            res.setHeader('Content-Length', chunksize);
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Cache-Control', 'no-cache');

            const chunks = client.iterDownload({
                file: msg.media,
                offset: bigInt(start),
                limit: chunksize,
                requestSize: 512 * 1024, // 512KB chunks
            });

            for await (const chunk of chunks) {
                res.write(chunk);
            }
            res.end();
            return;
        }

        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', 'inline'); // Display in browser
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.setHeader('Accept-Ranges', 'bytes');
        if (fileSize) {
            res.setHeader('Content-Length', fileSize);
        }

        // Stream the file
        const chunks = client.iterDownload({
            file: msg.media,
            requestSize: 512 * 1024,
        });

        for await (const chunk of chunks) {
            res.write(chunk);
        }
        res.end();

    } catch (error) {
        console.error('View error:', error);
        if (!res.headersSent) {
            res.status(500).json({ message: error.message || 'Failed to view file' });
        } else {
            res.end();
        }
    }
});

const upload = multer({ dest: os.tmpdir() });

router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const client = await getUserClient(req, res);
        if (!client) {
            // Cleanup if auth failed
            fs.unlink(req.file.path, () => { });
            return;
        }

        const { path, originalname, size } = req.file;
        const { CustomFile } = require('telegram/client/uploads');

        // Use file path for CustomFile to support large files and avoid buffer issues
        const toUpload = new CustomFile(originalname, size, path);

        const message = await client.sendFile('me', {
            file: toUpload,
            forceDocument: true,
            workers: 1,
        });

        const { folderId } = req.body;
        if (folderId && message && message.id) {
            await FileFolderMap.create({
                messageId: message.id,
                driveId: 'me',
                folderId,
                userId: req.userId
            });
        }

        // Clean up temp file
        fs.unlink(path, (err) => {
            if (err) console.error('Failed to delete temp upload file:', err);
        });

        res.json({ message: 'File uploaded successfully' });
    } catch (error) {
        console.error('Upload error:', error);
        // Clean up temp file in case of error too
        if (req.file && req.file.path) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Failed to delete temp upload file:', err);
            });
        }
        res.status(500).json({ message: error.message || 'Failed to upload file' });
    }
});

router.delete('/delete/:fileId', async (req, res) => {
    const { fileId } = req.params;
    const { driveId } = req.query;

    if (!driveId) {
        return res.status(400).json({ message: 'Missing driveId query parameter' });
    }

    try {
        const client = await getUserClient(req, res);
        if (!client) return;

        let entity = driveId === 'me' ? 'me' : driveId;
        const msgId = parseInt(fileId);

        // Revoke: true deletes for everyone in chats/channels
        await client.deleteMessages(entity, [msgId], { revoke: true });

        // Clean up from folders
        await FileFolderMap.deleteMany({ messageId: msgId, driveId, userId: req.userId });

        res.json({ message: 'File deleted successfully' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ message: error.message || 'Failed to delete file' });
    }
});

router.put('/rename/:fileId', async (req, res) => {
    const { fileId } = req.params;
    const { driveId } = req.query;
    const { newName } = req.body;

    if (!driveId || !newName) {
        return res.status(400).json({ message: 'Missing driveId or newName' });
    }

    let tempPath = null;

    try {
        const client = await getUserClient(req, res);
        if (!client) return;

        let entity = driveId === 'me' ? 'me' : driveId;
        const messageId = parseInt(fileId);

        // 1. Get the original message to download its media
        const messages = await client.getMessages(entity, { ids: [messageId] });
        if (!messages || messages.length === 0) {
            return res.status(404).json({ message: 'File not found' });
        }
        const message = messages[0];

        // 2. Download media to temp file
        const tempFileName = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
        tempPath = path.join(os.tmpdir(), tempFileName);

        const buffer = await client.downloadMedia(message, { workers: 1 });
        if (!buffer) {
            return res.status(500).json({ message: 'Failed to download file media' });
        }
        fs.writeFileSync(tempPath, buffer);

        // 3. Create CustomFile with the NEW name
        const { CustomFile } = require('telegram/client/uploads');
        // We need the file size. 
        const stats = fs.statSync(tempPath);
        const toUpload = new CustomFile(newName, stats.size, tempPath);

        // 4. Edit the message with the new file
        await client.editMessage(entity, {
            message: messageId,
            file: toUpload,
            forceDocument: true,
        });

        res.json({ message: 'File renamed successfully' });

    } catch (error) {
        console.error('Rename error:', error);
        res.status(500).json({ message: error.message || 'Failed to rename file' });
    } finally {
        // 5. Cleanup
        if (tempPath && fs.existsSync(tempPath)) {
            fs.unlink(tempPath, (err) => {
                if (err) console.error('Failed to cleanup temp rename file:', err);
            });
        }
    }
});

module.exports = router;
