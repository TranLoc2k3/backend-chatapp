const dynamoose = require("dynamoose");
const { v4: uuidv4 } = require("uuid");

const schema = new dynamoose.Schema({
  id: {
    type: "string",
    hashKey: true,
    index: true,
    default: () => uuidv4(),
  },
  senderId: {
    type: "string",
    index: true,
  },
  receiverId: {
    type: "string",
    index: true,
  },
  //   PENDING | ACCEPTED | DECLINED
  status: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const FriendRequest = dynamoose.model("FriendRequest", schema);
module.exports = FriendRequest;
