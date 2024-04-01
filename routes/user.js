const router = require("express").Router();
const userController = require("../controllers/userController");

router.get("/get-user/:phone", userController.getUserByPhone);

module.exports = router;
