const { sendFriendRequest } = require("./userController");

const handleSendFriendRequest = (socket) => {
  socket.on("new friend request client", async (payload) => {
    const { senderId, receiverId, socketId } = payload;
    const res = await sendFriendRequest(senderId, receiverId);
    socket.emit("new friend request server", "hehe");
  });
};

module.exports = {
  handleSendFriendRequest,
};
