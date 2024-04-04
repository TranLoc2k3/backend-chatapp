const router = require("express").Router();
const userController = require("../controllers/userController");

router.get("/get-user/:phone", userController.getUserByPhone);
// router.post("/send-friend-request", userController.sendFriendRequest);
router.post("/process-friend-request", userController.handleFriendRequest);
router.get("/get-all-friend-requests/:id", userController.getAllFriendRequests);

module.exports = router;
