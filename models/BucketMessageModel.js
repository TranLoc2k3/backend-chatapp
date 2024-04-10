const dynamoose = require('dynamoose');

const schema = new dynamoose.Schema({
    IDBucketMessage: String,
    listIDMessageDetail: {
        type: Array,
        schema: [String]
    },
    IDNextBucket: {
        default: "",
        type: String
    }
});

const BucketMessage = dynamoose.model("BucketMessage", schema);

module.exports = BucketMessage;