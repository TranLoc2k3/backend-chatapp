const dynamoose = require('dynamoose');
require('dotenv').config()

const connectDB = () => {
    const ddb = new dynamoose.aws.ddb.DynamoDB({
        "credentials": {
            "accessKeyId": 'omvtai',
            "secretAccessKey": '3t9xfr'
        },
        "region": "local",
    });
    dynamoose.aws.ddb.set(ddb);
}

module.exports =  connectDB

