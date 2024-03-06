const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const UserModel = require("../models/User");
const { getUserByID } = require("../controllers/User");

router.post("/sign-up", async (req, res) => {
  const { username, password } = req.body;
  //Check username, password
  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Vui lòng cung cấp username và password." });
  }
  // Check existing user
  // Đã có hàm getUserByID của User.js controller, nhưng chưa truyền username từ đây sang để check được
  const myUser = await UserModel.get(username);
  if (myUser) {
    return res.status(400).json("Username existing");
  }

  bcrypt.hash(password, 10).then(async (hash) => {
    try {
      const newUser = await UserModel.create({
        ID: username,
        username: username,
        phone: username,
        password: hash,
      });
      res.status(200).json(newUser);
    } catch (error) {
      console.error(error);
      res.status(400).json("UserModel create user not success");
    }
  });
});

router.post("/sign-in", async (req, res) => {
  const { username, password } = req.body;
  //Check username, password
  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Vui lòng cung cấp username và password." });
  }

  //Check existing username
  const myUser = await UserModel.get(username);
  if (!myUser) {
    return res.status(400).json("Username is not exist");
  }
  else {
    bcrypt.compare(password, myUser.password, (err, res2) => {
      if (res2) {
        res.status(200).json("Success")
      }
      else res.status(400).json("The password is incorrect")
    })
  }
});

module.exports = router;
