const router = require("express").Router();
const userController = require("../controllers/userController");

router.get("/get-user/:phone", userController.getUserByPhone);
// router.post("/send-friend-request", userController.sendFriendRequest);
// router.post("/process-friend-request", userController.processFriendRequest);

module.exports = router;
