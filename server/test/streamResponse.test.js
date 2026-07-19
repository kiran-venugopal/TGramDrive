const test = require('node:test');
const assert = require('node:assert/strict');
const { getContentDisposition } = require('../utils/streamResponse');

test('returns attachment disposition when download is requested', () => {
  assert.equal(getContentDisposition('movie.mp4', { download: '1' }), 'attachment; filename="movie.mp4"');
});

test('returns inline disposition by default', () => {
  assert.equal(getContentDisposition('movie.mp4', {}), 'inline; filename="movie.mp4"');
});
