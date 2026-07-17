const fallbackMimeExtensions = {
    'application/json': 'json',
    'application/javascript': 'js',
    'application/xml': 'xml',
    'application/zip': 'zip',
    'application/x-zip-compressed': 'zip',
    'application/pdf': 'pdf',
    'application/octet-stream': 'bin',
    'text/plain': 'txt',
    'text/html': 'html',
    'text/css': 'css',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
};

async function getMimeExtension(mimeType) {
    if (!mimeType) return null;

    const normalizedMimeType = mimeType.split(';')[0].trim().toLowerCase();
    if (fallbackMimeExtensions[normalizedMimeType]) {
        return fallbackMimeExtensions[normalizedMimeType];
    }

    try {
        const mimeModule = await import('mime');
        const mimeInstance = mimeModule.default || mimeModule;
        if (mimeInstance && typeof mimeInstance.getExtension === 'function') {
            const extension = mimeInstance.getExtension(normalizedMimeType);
            if (extension) {
                return extension;
            }
        }
    } catch (error) {
        console.warn(`Unable to resolve MIME extension for ${normalizedMimeType}:`, error.message);
    }

    return null;
}

module.exports = {
    getMimeExtension,
};
