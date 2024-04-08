const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const UserModel = require("../models/UserModel");
const UserController = require("../controllers/userController");
const multer = require("multer");
const upload = multer();
const { v4: uuidv4 } = require("uuid");

const s3 = require("../configs/connectS3");

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
    return res.status(400).json({ message: "Username existing" });
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
  } else {
    bcrypt.compare(password, myUser.password, (err, res2) => {
      if (res2) {
        res.status(200).json({
          message: "Success",
          data: myUser.phone,
        });
      } else res.status(400).json("The password is incorrect");
    });
  }
});

//UI test
router.get("/form", (req, res) => {
  res.send(`
          <form action="/auth/update-info/0355887042" method="post" enctype="multipart/form-data">
              <input type="file" name="image"><br><br>
              <input type="text" name="fullname">

              <input type="radio" id="sex-male" name="sex" value="male">
              <label for="sex-male">Name</label><br>

              <input type="radio" id="sex-female" name="sex" value="female">
              <label for="sex-female">Nữ</label><br>

              <label for="birthday">Birthday:</label>
              <input type="date" id="birthday" name="birthday">

              <input type="submit" value="Upload">
          </form>
      `);
});

router.post("/update-info/:id", upload.single("image"), async (req, res) => {
  // if (!req.file) {
  //   return res.status(400).send("No image Avatar uploaded.");
  // }
  // const id = "0355887042";
  let urlavatar = "";
  const id = req.params.id;
  const { fullname, sex, birthday } = req.body;
  if (req?.file) {
    const params = {
      // Thay the bucket cá nhân, tui để tạm cái bucket trên lớp
      Bucket: process.env.BUCKET_NAME,
      Key: `${id}_${uuidv4()}`,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };

    // Tải hình ảnh lên S3

    urlavatar = (await s3.upload(params).promise()).Location;
  }
  const updateFields = {
    fullname: fullname,
    ismale: sex === "male" ? true : false,
    birthday: birthday,
  };
  if (urlavatar) updateFields.urlavatar = urlavatar;
  UserModel.update({ ID: id }, updateFields, (error, user) => {
    if (error) {
      console.error(error);
    } else {
      res
        .status(201)
        .json({ message: "Update information successfully", data: user });
    }
  });
});

router.patch("/reset-password", async (req, res) => {
  await UserController.resetPasswordByID(req, res);
});

router.patch("/update-password", async(req, res) => {
  await UserController.updatePasswordByID(req, res);
})

// Loc test
const conversationController = require("../controllers/conversationController")
router.get("/getConversation", async(req, res) => {
  const {IDUser, lastEvaluatedKey} = req.body;
  const data = await conversationController.getConversation(IDUser, lastEvaluatedKey);
  res.json(data);
})

module.exports = router;
