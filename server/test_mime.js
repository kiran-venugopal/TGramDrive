const mime = require('mime');
console.log('Keys:', Object.keys(mime));
if (mime.default) {
    console.log('Default keys:', Object.keys(mime.default));
    try {
        console.log('default.extension:', mime.default.extension('application/json'));
    } catch (e) { console.log('default.extension error:', e.message); }
    try {
        console.log('default.getExtension:', mime.default.getExtension('application/json'));
    } catch (e) { console.log('default.getExtension error:', e.message); }
}

