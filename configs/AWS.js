const AWS = require("aws-sdk")
AWS.config.update({
    accessKeyId: process.env.ACCESS_ID,
    secretAccessKey: process.env.ACCESS_KEY,
    region: process.env.AWS_REGION
});
const docClient = new AWS.DynamoDB.DocumentClient();

module.exports = docClient;