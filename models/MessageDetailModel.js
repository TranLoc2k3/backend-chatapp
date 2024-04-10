const dynamoose = require('dynamoose');
const moment = require('moment-timezone');
const schema = new dynamoose.Schema({
    IDMessageDetail: {
        type: String,
        hashKey: true,
    },
    IDSender: String,
    type: String,
    content: String,
    dateTime: {
        type: String,
        default: moment.tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DDTHH:mm:ss.SSS'),
    },
    isRemove: Boolean
});

const MessageDetail = dynamoose.model("MessageDetail", schema);

module.exports = MessageDetail;