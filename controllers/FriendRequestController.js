const FriendRequestModel = require("../models/FriendRequestModel");

const checkRequestExists = async (req, res) => {
  const { senderId, receiverId } = req.body;
  try {
    const request = await FriendRequestModel.scan({
      senderId: receiverId,
      receiverId: senderId,
    }).exec();
    if (request[0]) {
      const status = request[0].status;
      if (status === "PENDING") {
        return res.status(200).json({
          code: 0,
          message: `Friend request is exist`,
        });
      }
      if (status === "ACCEPTED") {
        return res.status(200).json({
          code: 2,
          message: `Already friend`,
        });
      }
    } else {
      return res.status(200).json({
        code: 1,
        message: "Friend request not found",
      });
    }
  } catch (error) {
    console.error(error);
    return false;
  }
};

module.exports = {
  checkRequestExists,
};
