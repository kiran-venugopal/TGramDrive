const sanitizeFileName = (fileName) => {
  return fileName
    .replace(/\r|\n/g, '')
    .replace(/"/g, '')
    .replace(/[\\/<>:\|\?\*]/g, '_')
    .trim();
};

const getContentDisposition = (fileName, options = {}) => {
  const safeFileName = sanitizeFileName(fileName || 'file');
  const isDownload = options.download === '1' || options.download === 'true' || options.download === true;
  if (isDownload) {
    return `attachment; filename="${safeFileName}"`;
  }

  return `inline; filename="${safeFileName}"`;
};

module.exports = {
  getContentDisposition,
};
