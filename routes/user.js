const router = require("express").Router();
const userController = require("../controllers/userController");

router.get("/get-user/:phone", userController.getUserByPhone);
// router.post("/send-friend-request", userController.sendFriendRequest);

router.post("/process-friend-request", userController.handleFriendRequest);

router.get("/get-all-friend-requests/:id", userController.getAllFriendRequests);

// Quý thực hiện huỷ kết bạn, chặn bạn , mở chặn
router.post('/unfriend', userController.unFriend);
module.exports = router;
