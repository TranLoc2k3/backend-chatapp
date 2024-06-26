const dynamoose = require("dynamoose");
const moment = require('moment-timezone');
const schema = new dynamoose.Schema({
    IDConversation: {
        type: String,
        hashKey: true,
    },
    IDSender: {
        type: String,
        rangeKey: true,
        index: {
            global: true,
            name: 'IDSender-lastChange-index',
            rangeKey: 'lastChange',
            project: false,
        },
    },
    isGroup: Boolean,
    groupName: String,
    groupAvatar: String,
    IDReceiver: String,
    IDNewestMessage: String,
    isBlock: Boolean,
    rules: {
        type: Object,
        schema: {
          IDOwner: String,
          listIDCoOwner: {
            type: Array,
            schema: [String]
          }
        }
      },
    groupMembers: {
        type: Array,
        default: [],
        schema: [String],
    },
    listImage: {
        type: Array,
        default: [],
        schema: [String],
    },
    listFile: {
        type: Array,
        default: [],
        schema: [String],
    },
    lastChange: {
        type: String,
        default: moment.tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DDTHH:mm:ss.SSS'),
    }
});

const Conversation = dynamoose.model("Conversation", schema);

module.exports = Conversation;
