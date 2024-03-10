const dynamoose = require("dynamoose");
require("dotenv").config();

const connectDB = () => {
  const ddb = new dynamoose.aws.ddb.DynamoDB({
    credentials: {
      accessKeyId: process.env.ACCESS_ID,
      secretAccessKey: process.env.ACCESS_KEY,
    },
    region: "local",
  });
  dynamoose.aws.ddb.set(ddb);
};

module.exports = connectDB;
