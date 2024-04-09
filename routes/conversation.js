const router = require("express").Router();
const userController = require("../controllers/userController");
router.post("/get-list-friend", userController.getFriendListByID);

module.exports = router;