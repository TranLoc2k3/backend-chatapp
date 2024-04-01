const UserModel = require("../models/UserModel");

const getAllUser = async (req, res) => {
  try {
    const data = await UserModel.scan().exec();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(200).json({ errCode: -1, errMessage: "Server error!" });
  }
};

const getUserByPhone = async (req, res) => {
  try {
    const phone = req.params.phone;
    const myUser = await UserModel.get(phone);
    if (myUser) {
      return res.status(200).json(myUser);
    }
    return res.status(404).json({ message: "User not found" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = {
  getAllUser,
  getUserByPhone,
};
