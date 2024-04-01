const { CostOptimizationHub } = require("aws-sdk");
const UserModel = require("../models/UserModel");
const bcrypt = require("bcrypt");
const getAllUser = async (req, res) => {
  try {
    const data = await UserModel.scan().exec();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(200).json({ errCode: -1, errMessage: "Server error!" });
  }
};

const getUserByID = async (req, res) => {

  const userID = req.body.username;
  const myUser = await UserModel.get(userID);
  if (myUser) {
    return myUser;
  }
  else return "User not found";
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
}

const updatePasswordByID = async (req, res) => {
  const userID = req.body.username;
  const newPassword = req.body.password;
  const myUser = await UserModel.get(userID);
  if (myUser) {
    bcrypt.hash(newPassword, 10).then(async (hash) => {
      if (hash == myUser.password) {
        res.json({message: "New password must be different from the old one"});
      }
      else {
        myUser.password = hash;
        try {
          const newUser = await myUser.save();
          res.json({message:"Update password success"});
        } catch (error) {
          res.json({message:"Update password failed"});
        }
      }
    });
  }
  else res.json({message: "User not found"});
}

module.exports = {
  getAllUser,
  getUserByID,
  getUserByPhone,
  updatePasswordByID
};
