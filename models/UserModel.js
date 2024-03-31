const dynamoose = require("dynamoose");

const schema = new dynamoose.Schema({
  ID: {
    type: String,
    hashKey: true,
  },
  username: String,
  password: String,
  fullname: String,
  ismale: Boolean,
  phone: String,
  urlavatar: String,
  birthday: String,
});

const User = dynamoose.model("User", schema);
module.exports = User;
