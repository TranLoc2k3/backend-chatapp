const { sendFriendRequest } = require("./userController");

let onlineUsers = [];

const addNewUser = (phone, socketId) => {
  !onlineUsers.some((user) => user.phone === phone) &&
    onlineUsers.push({ phone, socketId });
};

const removeUser = (socketId) => {
  onlineUsers = onlineUsers.filter((item) => item.socketId !== socketId);
};

const getUser = (phone) => {
  return onlineUsers.find((user) => user.phone === phone);
};

const handleUserOnline = (socket) => {
  socket.on("new user connect", (payload) => {
    addNewUser(payload.phone, socket.id);
  });

  socket.on("disconnect", () => {
    removeUser(socket.id);
  });
};
const handleSendFriendRequest = (io, socket) => {
  socket.on("new friend request client", async (payload) => {
    const { senderId, receiverId } = payload;
    const res = await sendFriendRequest(senderId, receiverId);
    const user = getUser(receiverId);
    socket.emit("send friend request server", res);
    if (user?.socketId) {
      io.to(user.socketId).emit("new friend request server", res);
    }
  });
};

module.exports = {
  handleSendFriendRequest,
  handleUserOnline,
};
