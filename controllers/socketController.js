const { sendFriendRequest } = require("./userController");
const conversationController = require("../controllers/conversationController")
const MessageDetailController = require("../controllers/MessageDetailController");

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
    res = listConversationWithDetails;
    socket.emit("load_conversations_server", res);
    // Tra về listIDConversation: array chưa IDConvertion (Tối đa 10 phần tử), 
    // lastEvaluatedKey: để lưu phần tử cuối cùng, khi nào muốn load tiếp thì gửi lastEvaluatedKey lên
    // res = {
    //   "listIDConversation": [
    //       "2024-04-06T17:26:32.788Za1ad9383-4c43-4ef5-a295-d90bab6bb34d"
    //   ],
    //   "lastEvaluatedKey": {
    //       "IDSender": "123",
    //       "lastChange": "2024-04-07T00:26:32.789",
    //       "IDConversation": "2024-04-06T17:26:32.788Za1ad9383-4c43-4ef5-a295-d90bab6bb34d"
    //   }
    // }
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
