const router = require("express").Router();
const FriendRequestController = require("../controllers/FriendRequestController");

router.post(
  "/check-request-exists",
  FriendRequestController.checkRequestExists
);

module.exports = router;
