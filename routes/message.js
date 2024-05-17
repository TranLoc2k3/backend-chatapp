const router = require("express").Router();
const MesageDetailController = require("../controllers/MessageDetailController");

router.post("/remove", MesageDetailController.removeMessageDetail);


module.exports = router;
