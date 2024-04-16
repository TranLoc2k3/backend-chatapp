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

// API thêm 1 user thành phó nhóm
router.post("/addCoOwnerToGroup", async (req, res) => {
  const {IDConversation, IDCoOwner} = req.body;
  try {
    const data = await conversationController.addCoOwnerToGroup(IDConversation, IDCoOwner);
    return res.json(data); // Success
  } catch (error) {
    res.json(error)
  }
});

router.post("/removeCoOwnerFromGroup", async (req, res) => {
  const {IDConversation, IDCoOwner} = req.body;
  try {
    const data = await conversationController.removeCoOwnerFromGroup(IDConversation, IDCoOwner);
    return res.json(data); // Success
  } catch (error) {
    res.json(error)
  }
})
module.exports = router;
