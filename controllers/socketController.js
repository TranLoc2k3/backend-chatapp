const { sendFriendRequest } = require("./userController");
const conversationController = require("../controllers/conversationController");
const MessageDetailController = require("../controllers/MessageDetailController");
const UserController = require("../controllers/userController");
const BucketMessageController = require("../controllers/BucketMessageController");
const { v4: uuidv4 } = require("uuid");
const MessageController = require("../controllers/MessageController");
const moment = require("moment-timezone");
const s3 = require("../configs/connectS3");
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
    const data = await conversationController.getConversation(
      IDUser,
      lastEvaluatedKey
    );
    const listIDConversation = data.Items?.map((item) => item.IDConversation);
    const lastKey = data.LastEvaluatedKey;
    const listConversation = await Promise.all(
      listIDConversation.map((IDConversation) =>
        conversationController.getConversationByID(IDConversation, IDUser)
      )
    );
    let res = listConversation;
    const listConversationWithDetails = await Promise.all(
      listConversation.map(async (conversation) => {
        if (!conversation.IDNewestMessage) {
          return conversation;
        }
        const MessageDetail =
          await MessageDetailController.getMessagesDetailByID(
            conversation.IDNewestMessage
          );
        return { ...conversation, MessageDetail };
      })
    );

    const listConversationDetails2 = await Promise.all(
      listConversationWithDetails.map(async (conversation) => {
        if (conversation.isGroup == false) {
          let Receiver = await UserController.getUserByID({
            body: { username: conversation.IDReceiver },
          });
          Receiver = {
            ID: Receiver.ID,
            fullname: Receiver.fullname,
            urlavatar: Receiver.urlavatar,
          };
          return { ...conversation, Receiver };
        }
      })
    );
    res = listConversationDetails2;

    socket.emit("load_conversations_server", res);
  });
};

const handleSendMessage = async (io, socket) => {
  socket.on("send_message", async (payload) => {
    let dataConversation = await conversationController.getConversationByID(
      payload.IDConversation,
      payload.IDSender
    );
    let dataMessage = await MessageController.getMessagesByIDConversation(
      payload.IDConversation
    );

    // Chat Image
    const listImage = payload.image;
    listImage.forEach(async (image) => {
      //Save to db
      console.log(payload.IDSender, payload.IDConversation, image);
      const dataImageMessage = await handleImageMessage(
        payload.IDSender,
        payload.IDConversation,
        image
      );
      console.log(handleImageMessage());
      console.log(dataImageMessage);
      //Update bucket
      const dataBucket = await updateBucketMessage(
        dataMessage.IDNewestBucket,
        dataImageMessage.IDMessageDetail
      );
      if (dataBucket.IDBucketMessage !== dataMessage.IDNewestBucket) {
        dataMessage.IDNewestBucket = dataBucket.IDBucketMessage;
        const updateMessage = await MessageController.updateMessage(
          dataMessage
        );
      }

      // Trigger event socket
      if (dataImageMessage) {
        socket.emit("receive_message", dataImageMessage);
      }
      const IDReceiver = dataConversation.IDReceiver;
      const user = getUser(IDReceiver);
      if (user?.socketId) {
        io.to(user.socketId).emit("receive_message", dataImageMessage);
      }

      //Update lastChange
      updateLastChangeConversation(payload.IDConversation, payload.IDSender);
      updateLastChangeConversation(payload.IDConversation, IDReceiver);
    });

    //Chat Video

    // Chat text
    // payload = {
    //   IDSender: IDSender,
    //   IDConversation: IDConversation,
    //   textMessage: textMessage (Chuoi tin nhăn)
    // }
    const textmessage = await handleTextMessage(io, socket, payload);
    const dataMessage = await MessageController.getMessagesByIDConversation(
      payload.IDConversation
    );
    const dataBucket = await updateBucketMessage(
      dataMessage.IDNewestBucket,
      textmessage.IDMessageDetail
    );
    const dataConversation = await conversationController.getConversationByID(
      payload.IDConversation,
      payload.IDSender
    );

    if (dataMessage.IDNewestBucket !== dataBucket.IDBucketMessage) {
      dataMessage.IDNewestBucket = dataBucket.IDBucketMessage;
      const updateMessage = await MessageController.updateMessage(dataMessage);
    }

    socket.emit("receive_message", textmessage);
    const IDReceiver = dataConversation.IDReceiver;
    const user = getUser(IDReceiver);
    if (user?.socketId) {
      io.to(user.socketId).emit("receive_message", textmessage);
    }

    updateLastChangeConversation(payload.IDConversation, payload.IDSender);
    updateLastChangeConversation(payload.IDConversation, IDReceiver);
  });
};

const updateLastChangeConversation = async (IDConversation, IDSender) => {
  const dataConversation = await conversationController.getConversationByID(
    IDConversation,
    IDSender
  );
  dataConversation.lastChange = moment
    .tz("Asia/Ho_Chi_Minh")
    .format("YYYY-MM-DDTHH:mm:ss.SSS");
  const updateConversation = await conversationController.updateConversation(
    dataConversation
  );
  return updateConversation;
};

const updateBucketMessage = async (IDBucketMessage, IDMessageDetail) => {
  const bucket = await BucketMessageController.getBucketMessageByID(
    IDBucketMessage
  );
  const listIDMessageDetail = bucket.listIDMessageDetail;
  if (listIDMessageDetail.length >= 35) {
    let dataBucket = {
      IDBucketMessage: uuidv4(),
      listIDMessageDetail: [IDMessageDetail],
      IDNextBucket: bucket.IDBucketMessage,
    };

    const newBucket = await BucketMessageController.createBucketMessage(
      dataBucket
    );
    return newBucket;
  } else {
    bucket.listIDMessageDetail.push(IDMessageDetail);
    const updateBucket = await BucketMessageController.updateBucketMessage(
      bucket
    );
    return updateBucket;
  }
};

const handleTextMessage = async (io, socket, payload) => {
  const { IDSender, IDConversation, textMessage } = payload;
  const message = await MessageDetailController.createTextMessageDetail(
    IDSender,
    IDConversation,
    textMessage
  );
  return message;
};

// Hàm này để test các method của các controller bằng socket
const handleTestSocket = (io, socket) => {
  socket.on("test_socket", async (payload) => {
    // const payload = {
    //   image,
    //   video,
    // }
    // socket.emit("test_socket", payload);
    // socket.on("test_socket_server", (data) => {
    //   console.log(data);
    // });
    // const s3 = require("../configs/connectS3");
    // const { v4: uuidv4 } = require("uuid");
    // const listImage = payload.image;
    // const videos = payload.video;
    // videos.forEach(async video => {
    //   const params = {
    //     Bucket: 'imagetintin',
    //     Key: uuidv4(),
    //     Body: video
    //   }
    //   s3.upload(params, (err, data) => {
    //     if (err) {
    //       console.error(err);
    //     }
    //     console.log(`File uploaded successfully at ${data.Location}`);
    //   });
    // });
    // listImage.forEach(async (image) => {
    //   const params = {
    //     Bucket: 'imagetintin',
    //     Key: uuidv4(),
    //     Body: image
    //   }
    //   try {
    //     const data = await s3.upload(params).promise();
    //     console.log(`File uploaded successfully at ${data.Location}`);
    //   } catch (error) {
    //     console.error(error);
    //   }
    // });
  });
};

module.exports = {
  handleSendFriendRequest,
  handleUserOnline,
  handleLoadConversation,
  handleTestSocket,
  handleSendMessage,
};
