const AWS = require("aws-sdk");
require("dotenv").config();

// Khởi tạo AWS SDK
const s3 = new AWS.S3({
  accessKeyId: process.env.ACCESS_KEY_ID_S3,
  secretAccessKey: process.env.SECRET_ACCESS_KEY_S3,
});

module.exports = s3;
