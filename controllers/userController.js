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
  const oldPassword = req.body.oldpassword;
  const newPassword = req.body.newpassword;

  const myUser = await UserModel.get(userID);
  if (myUser) {
    bcrypt.compare(oldPassword, myUser.password, (err, res1) => {
      if (!res1) {
        res.status(400).json({ message: "Old password is incorrect" });
      }
      else {
        bcrypt.compare(newPassword, myUser.password, (err, res2) => {
          if (res2) {
            res.status(400).json({ message: "Password is the same" });
          } else {
            bcrypt.hash(newPassword, 10).then(async (hash) => {
              myUser.password = hash;
              try {
                const newUser = await myUser.save();
                res.json({ message: "Update password success" });
              } catch (error) {
                res.json({ message: "Update password failed" });
              }
            });
          }
        });
      }
    });
  }
  else res.json({ message: "User not found" });
}

module.exports = {
  getAllUser,
  getUserByID,
  getUserByPhone,
  updatePasswordByID
};
