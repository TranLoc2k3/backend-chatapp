const { sendFriendRequest } = require("./userController");
const conversationController = require("../controllers/conversationController")
const MessageDetailController = require("../controllers/MessageDetailController");
const UserController = require("../controllers/userController");
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

const handleLoadConversation = (io, socket) => {
  socket.on("load_conversations", async (payload) => {
    const { IDUser, lastEvaluatedKey } = payload;
    const data = await conversationController.getConversation(IDUser, lastEvaluatedKey);
    const listIDConversation = data.Items?.map(item => item.IDConversation);
    const lastKey = data.LastEvaluatedKey;
    const listConversation = await Promise.all(listIDConversation.map(
      IDConversation => conversationController.getConversationByID(IDConversation, IDUser)));
    let res = listConversation;
    const listConversationWithDetails = await Promise.all(
      listConversation.map(async conversation => {
        const MessageDetail = await MessageDetailController.getMessagesDetailByID(conversation.IDNewestMessage);
        return { ...conversation, MessageDetail };
      })
    );

    const listConversationDetails2 = await Promise.all(
      listConversationWithDetails.map(async conversation => {
        if (conversation.isGroup == false) {

          let Receiver = await UserController.getUserByID({ body: { username: conversation.IDReceiver }});
          Receiver = {ID: Receiver.ID, fullname: Receiver.fullname, urlavatar: Receiver.urlavatar};
            return { ...conversation, Receiver};
        }
      })
    );
    res = listConversationDetails2;

    socket.emit("load_conversations_server", res);
  })
}

// Hàm này để test các method của các controller bằng socket
const handleTestSocket = (io, socket) => {
  socket.on("test_socket", async (payload) => {
    const data = await MessageDetailController.getMessagesDetailByID(payload);
    console.log(data);
  });
}


module.exports = {
  handleSendFriendRequest,
  handleUserOnline,
  handleLoadConversation,
  handleTestSocket
};
