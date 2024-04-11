const detectFileExtension = (mimeType) => {
  const mimeTypes = {
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      ".docx",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      ".xlsx",
    "text/plain": ".txt",
    "application/pdf": ".pdf",
    "application/zip": ".zip",
    "application/vnd.rar": ".rar",
  };

  return mimeTypes[mimeType.toLowerCase()] || "";
};

module.exports = {
  detectFileExtension,
};
