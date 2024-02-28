const dynamoose = require("dynamoose");

const schema = new dynamoose.Schema(
  {
    phone_number: {
      type: String,
      hashKey: true,
    },
    full_name: String,
    hash_password: String,
  }
);

const UsersModel = dynamoose.model("Users", schema);
module.exports = UsersModel;