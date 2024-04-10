const router = require("express").Router();
const userController = require("../controllers/userController");
const conversationController = require("../controllers/conversationController");
router.post("/get-list-friend", userController.getFriendListByID);
router.post("/getMessageDetail", conversationController.getMessageDetailByIDConversation);
module.exports = router;