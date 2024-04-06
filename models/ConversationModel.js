const dynamoose = require("dynamoose");

const schema = new dynamoose.Schema({
    IDConversation: {
        type: String,
        hashKey: true,
    },
    IDSender: {
        type: String,
        rangeKey: true,
    },
    isGroup: Boolean,
    groupName: String,
    groupAvatar: String,
    IDReceiver: String,◘
    groupMembers: [String],
    listImage: [String],
    listFile: [String],
    lastChange: {
        type: String,
        default: new Date().toISOString(),
    }


});

const User = dynamoose.model("User", schema);

module.exports = User;
