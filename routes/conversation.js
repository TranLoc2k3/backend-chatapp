const router = require("express").Router();
const userController = require("../controllers/userController");
const conversationController = require("../controllers/conversationController");
const multer = require("multer");
const upload = multer({ dest: 'uploads/' });
router.post("/get-list-friend", userController.getFriendListByID);
router.post(
  "/getMessageDetail",
  conversationController.getMessageDetailByIDConversation
);


router.post("/createNewGroupConversation", upload.single("groupAvatar"), async (req, res) => {
  let {IDOwner, groupName, groupMembers} = req.body;
  const groupAvatar = req.file;
  // groupMembers là mảng ID của các thành viên kể cả người tạo nhóm
  // groupMembers = ["1", "2", "3", "4"];
  const data = await conversationController.createNewGroupConversation(IDOwner, groupName, groupAvatar, groupMembers);
  res.json(data);
});
module.exports = router;
