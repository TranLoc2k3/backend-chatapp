const AWS = require('aws-sdk');
require("dotenv").config();

// Khởi tạo AWS SDK
const s3 = new AWS.S3({
    accessKeyId: "AKIAQ3EGSUPLUFZKQA44",
    secretAccessKey: "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",
  });

module.exports = s3;