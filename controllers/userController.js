const UserModel = require("../models/UserModel");
const FriendRequestModel = require("../models/FriendRequestModel");
const bcrypt = require("bcrypt");
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

const updatePasswordByID = async (req, res) => {
  const userID = req.body.username;
  const oldPassword = req.body.oldpassword;
  const newPassword = req.body.newpassword;

  const myUser = await UserModel.get(userID);
  if (myUser) {
    bcrypt.compare(oldPassword, myUser.password, (err, res1) => {
      if (!res1) {
        res.status(400).json({ message: "Old password is incorrect" });
      } else {
        bcrypt.compare(newPassword, myUser.password, (err, res2) => {
          if (res2) {
            res.status(400).json({ message: "Password is the same" });
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
      return {
        code: 0,
        mesage: "Request was sended",
      };
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
  const res = await UserModel.update({
    ID: senderId,
    friendList: [...senderUser.friendList, receiverId],
  });
  console.log(res);
};

const handleFriendRequest = async (req, res) => {
  const { id, type } = req.body;
  // type = ACCEPTED | DECLINED
  try {
    const friendRequest = await FriendRequestModel.scan({
      id,
      status: "PENDING",
    }).exec();

    if (friendRequest.length > 0) {
      // const updated = await FriendRequestModel.update({
      //   id,
      //   status: type,
      // });
      // console.log(updated);
      if (type === "ACCEPTED") {
        addToFriendList("84704462651", "84766785319");
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

module.exports = {
  getAllUser,
  getUserByID,
  getUserByPhone,
  updatePasswordByID,
  sendFriendRequest,
  handleFriendRequest,
  getAllFriendRequests,
};
