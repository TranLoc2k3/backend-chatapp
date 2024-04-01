const AWS = require("aws-sdk");
require("dotenv").config();

// Khởi tạo AWS SDK
const s3 = new AWS.S3({
  accessKeyId: "",
  secretAccessKey: "",
});

module.exports = s3;
