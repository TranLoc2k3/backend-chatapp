const UserModel = require("../models/UserModel");
const FriendRequestModel = require("../models/FriendRequestModel");
const bcrypt = require("bcrypt");
const conversationController = require("./conversationController");
const MessageController = require("./MessageController");
const getAllUser = async (req, res) => {
  try {
    const data = await UserModel.scan().exec();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(200).json({ errCode: -1, errMessage: "Server error!" });
  }
};

const getUserByID = async (req, res) => {
  const userID = req.body.username;
  const myUser = await UserModel.get(userID);
  if (myUser) {
    return myUser;
  } else return "User not found";
};

const getUserByPhone = async (req, res) => {
  try {
    const phone = req.params.phone;
    const myUser = await UserModel.get(phone);
    if (myUser) {
      return res.status(200).json(myUser);
    }
    return res.status(404).json({ message: "User not found" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const resetPasswordByID = async (req, res) => {
  const userID = req.body.username;
  const newPassword = req.body.newpassword;

  const myUser = await UserModel.get(userID);
  if (myUser) {
    bcrypt.compare(newPassword, myUser.password, (err, res2) => {
      if (res2) {
        res.json({ message: "Password is the same" });
      } else {
        bcrypt.hash(newPassword, 10).then(async (hash) => {
          myUser.password = hash;
          try {
            const newUser = await myUser.save();
            res.json({ message: "Update password success" });
          } catch (error) {
            res.json({ message: "Update password failed" });
          }
        });
      }
    });
  } else res.json({ message: "User not found" });
};

const sendFriendRequest = async (senderId, receiverId) => {
  const myFriendRequest = await FriendRequestModel.scan({
    senderId,
    receiverId,
  }).exec();
  try {
    if (myFriendRequest.length > 0) {
      if (myFriendRequest[0].status === "ACCEPTED") {
        return {
          code: 2,
          message: "Already friend",
        };
      }
      if (myFriendRequest[0].status === "PENDING") {
        return {
          code: 0,
          mesage: "Request was sended",
        };
      }
    }

    const newFriendRequest = await FriendRequestModel.create({
      senderId: senderId,
      receiverId: receiverId,
      status: "PENDING",
    });

    if (newFriendRequest) {
      return {
        code: 1,
        mesage: "Request send successfully",
        data: {
          senderId,
          receiverId,
        },
      };
    }
  } catch (e) {
    return {
      code: -1,
      message: "Error !" + e,
    };
  }
};

const addToFriendList = async (senderId, receiverId) => {
  const senderUser = await UserModel.get(senderId);
  const receiverUser = await UserModel.get(receiverId);
  if (!senderUser.friendList) {
    senderUser.friendList = [];
  }
  if (!receiverUser.friendList) {
    receiverUser.friendList = [];
  }
  senderUser.friendList.push(receiverId);
  receiverUser.friendList.push(senderId);
  try {
    await senderUser.save();
    await receiverUser.save();
    return {
      message: "Add friend success",
    };
  } catch (e) {
    console.log(e);
    return e;
  }
};

const handleFriendRequest = async (req, res) => {
  const { id, type } = req.body;
  // type = ACCEPTED | DENIED
  try {
    const friendRequest = await FriendRequestModel.scan({
      id,
      status: "PENDING",
    }).exec();

    if (friendRequest.length > 0) {
      const updated = await FriendRequestModel.update({
        id,
        status: type,
      });
      if (type === "ACCEPTED") {
        addToFriendList(updated.senderId, updated.receiverId);

        const data = await conversationController.createNewSignleConversation(
          updated.senderId,
          updated.receiverId
        );
        const data2 = await conversationController.createNewSignleConversation(
          updated.receiverId,
          updated.senderId,
          data.IDConversation
        );
        const dataNewMessage = MessageController.createNewMessage(
          data.IDConversation
        );
      }
      return res.status(200).json({
        code: 1,
        message: `Friend request ${type.toLowerCase()} successfully`,
      });
    }

    return res.status(200).json({
      code: 1,
      message: `Not found friend request`,
    });
  } catch (e) {
    console.log(e);
    return res.status(200).json("Error from server");
  }
};

const getAllFriendRequests = async (req, res) => {
  const { id } = req.params;
  try {
    const friendRequest = await FriendRequestModel.scan({
      receiverId: id,
      status: "PENDING",
    }).exec();
    for (let item of friendRequest) {
      const sender = await UserModel.get(item.senderId);
      item.sender = sender;
    }
    return res.status(200).json(friendRequest);
  } catch (e) {
    return res.status(200).json({ message: "Error from server" });
  }
};

const updatePasswordByID = async (req, res) => {
  const userID = req.body.username;
  const oldPassword = req.body.oldpassword;
  const newPassword = req.body.newpassword;

  const myUser = await UserModel.get(userID);
  if (myUser) {
    bcrypt.compare(oldPassword, myUser.password, (err, res2) => {
      if (res2) {
        bcrypt.compare(newPassword, myUser.password, (err, res3) => {
          if (res3) {
            res.json({ message: "Password is the same" });
          } else {
            bcrypt.hash(newPassword, 10).then(async (hash) => {
              myUser.password = hash;
              try {
                const newUser = await myUser.save();
                res.json({ message: "Update password success" });
              } catch (error) {
                res.json({ message: "Update password failed" });
              }
            });
          }
        });
      } else res.json({ message: "Old password is incorrect" });
    });
  } else res.json({ message: "User not found" });
};
const getFriendListByID = async (req, res) => {
  const userID = req.body.username;
  const myUser = await UserModel.get(userID);

  if (myUser) {
    const friendDetails = await Promise.all(
      myUser?.friendList.map(async (friendID) => {
        const friend = await UserModel.get(friendID);
        return friend;
      })
    );
    res.status(200).json(friendDetails);
  } else res.json({ message: "User not found" });
};

module.exports = {
  getAllUser,
  getUserByID,
  getUserByPhone,
  resetPasswordByID,
  sendFriendRequest,
  handleFriendRequest,
  getAllFriendRequests,
  updatePasswordByID,
  getFriendListByID,
};
