const getContentDisposition = (fileName, options = {}) => {
  const isDownload = options.download === '1' || options.download === 'true' || options.download === true;
  if (isDownload) {
    return `attachment; filename="${fileName}"`;
  }

  return `inline; filename="${fileName}"`;
};

module.exports = {
  getContentDisposition,
};
