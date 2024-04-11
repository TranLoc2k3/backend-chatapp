const { sendFriendRequest } = require("./userController");
const conversationController = require("../controllers/conversationController");
const MessageDetailController = require("../controllers/MessageDetailController");
const UserController = require("../controllers/userController");
const BucketMessageController = require("../controllers/BucketMessageController");
const { v4: uuidv4 } = require("uuid");
const MessageController = require("../controllers/MessageController");
const moment = require("moment-timezone");
const s3 = require("../configs/connectS3");
const URL = require("url").URL;
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
    if (!data.Items) return;
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

const handleSendFile = async (IDSender, IDConversation, file) => {
  // Save file to S3
  const { mimeType, content, fileName } = file;
  const params = {
    Bucket: "imagetintin",
    Key: `${uuidv4()}_${fileName}`,
    Body: content,
    ContentType: mimeType,
  };
  try {
    const fileData = await s3.upload(params).promise();
    // Save file data to database
    const dataFileMessage = await MessageDetailController.createNewFileMessage(
      IDSender,
      IDConversation,
      fileData.Location // The URL of the file on S3
    );
    return dataFileMessage;
  } catch (error) {
    console.error(error);
    return "Error upload file";
  }
};

const handleSendMessage = async (io, socket) => {
  socket.on("send_message", async (payload) => {
    // Check có bao nhiêu sending message đang gửi
    socket.emit("sending_message", () => {
      return payload.textMessage
        ? payload.image.length +
            payload.fileList.length +
            payload.video.length +
            1
        : payload.image.length + payload.fileList.length + payload.video.length;
    });

    let dataConversation = await conversationController.getConversationByID(
      payload.IDConversation,
      payload.IDSender
    );
    let dataMessage = await MessageController.getMessagesByIDConversation(
      payload.IDConversation
    );

    //Chat Video
    const listVideo = payload.video || [];
    listVideo.forEach(async (video) => {
      const params = {
        Bucket: "videotintin",
        Key: uuidv4(),
        Body: video,
      };
      try {
        const data = await s3.upload(params).promise();
        const videoMessage =
          await MessageDetailController.createNewVideoMessage(
            payload.IDSender,
            payload.IDConversation,
            data.Location
          );
        const dataBucket = await updateBucketMessage(
          dataMessage.IDNewestBucket,
          videoMessage.IDMessageDetail
        );
        if (dataMessage.IDNewestBucket !== dataBucket.IDBucketMessage) {
          dataMessage.IDNewestBucket = dataBucket.IDBucketMessage;
          const updateMessage = await MessageController.updateMessage(
            dataMessage
          );
        }

        socket.emit("receive_message", videoMessage);
        const IDReceiver = dataConversation.IDReceiver;
        const user = getUser(IDReceiver);
        if (user?.socketId) {
          io.to(user.socketId).emit("receive_message", videoMessage);
        }

        updateLastChangeConversation(payload.IDConversation, payload.IDSender);
        updateLastChangeConversation(payload.IDConversation, IDReceiver);
      } catch (error) {
        console.error(error);
      }
    });

    // Chat Image
    const listImage = payload.image || [];
    listImage.forEach(async (image) => {
      //Save to db
      const dataImageMessage = await handleImageMessage(
        payload.IDSender,
        payload.IDConversation,
        image
      );
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

    // Chat file
    const fileList = payload.fileList || [];
    for (let file of fileList) {
      const dataFileMessage = await handleSendFile(
        payload.IDSender,
        payload.IDConversation,
        file
      );
      // Update bucket
      const dataBucket = await updateBucketMessage(
        dataMessage.IDNewestBucket,
        dataFileMessage.IDMessageDetail
      );

      if (dataBucket.IDBucketMessage !== dataMessage.IDNewestBucket) {
        dataMessage.IDNewestBucket = dataBucket.IDBucketMessage;
        const updateMessage = await MessageController.updateMessage(
          dataMessage
        );
      }

      // Trigger event socket
      if (dataFileMessage) {
        socket.emit("receive_message", dataFileMessage);
      }
      const IDReceiver = dataConversation.IDReceiver;
      const user = getUser(IDReceiver);
      if (user?.socketId) {
        io.to(user.socketId).emit("receive_message", dataFileMessage);
      }

      // Update lastChange
      updateLastChangeConversation(payload.IDConversation, payload.IDSender);
      updateLastChangeConversation(payload.IDConversation, IDReceiver);
    }

    // Chat text
    if (!payload.textMessage) return;
    else {
      //Chat link
      if (stringIsAValidUrl(payload.textMessage)) {
        const linkmessage = await MessageDetailController.handleLinkMessage(
          payload.IDSender,
          payload.IDConversation,
          payload.textMessage
        );
        const dataBucket = await updateBucketMessage(
          dataMessage.IDNewestBucket,
          linkmessage.IDMessageDetail
        );

        if (dataMessage.IDNewestBucket !== dataBucket.IDBucketMessage) {
          dataMessage.IDNewestBucket = dataBucket.IDBucketMessage;
          const updateMessage = await MessageController.updateMessage(
            dataMessage
          );
        }

        socket.emit("receive_message", linkmessage);
        const IDReceiver = dataConversation.IDReceiver;
        const user = getUser(IDReceiver);
        if (user?.socketId) {
          io.to(user.socketId).emit("receive_message", linkmessage);
        }

        updateLastChangeConversation(payload.IDConversation, payload.IDSender);
        updateLastChangeConversation(payload.IDConversation, IDReceiver);
        return;
      }
      const textmessage = await handleTextMessage(
        payload.IDSender,
        payload.IDConversation,
        payload.textMessage
      );
      const dataBucket = await updateBucketMessage(
        dataMessage.IDNewestBucket,
        textmessage.IDMessageDetail
      );

      if (dataMessage.IDNewestBucket !== dataBucket.IDBucketMessage) {
        dataMessage.IDNewestBucket = dataBucket.IDBucketMessage;
        const updateMessage = await MessageController.updateMessage(
          dataMessage
        );
      }

      socket.emit("receive_message", textmessage);
      const IDReceiver = dataConversation.IDReceiver;
      const user = getUser(IDReceiver);
      if (user?.socketId) {
        io.to(user.socketId).emit("receive_message", textmessage);
      }

      updateLastChangeConversation(payload.IDConversation, payload.IDSender);
      updateLastChangeConversation(payload.IDConversation, IDReceiver);
    }
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

const handleTextMessage = async (IDSender, IDConversation, textMessage) => {
  // const { IDSender, IDConversation, textMessage } = payload;
  const message = await MessageDetailController.createTextMessageDetail(
    IDSender,
    IDConversation,
    textMessage
  );
  return message;
};

const handleImageMessage = async (IDSender, IDConversation, image) => {
  if (image instanceof Buffer) {
  } else {
    image = Buffer.from(
      image.replace(/^data:image\/\w+;base64,/, ""),
      "base64"
    );
  }
  const params = {
    Bucket: "imagetintin",
    Key: uuidv4(),
    Body: image,
  };
  console.log(params);
  try {
    const data = await s3.upload(params).promise();
    const imageMessage = await MessageDetailController.createNewImageMessage(
      IDSender,
      IDConversation,
      data.Location
    );
    console.log(imageMessage);
    return imageMessage;
  } catch (error) {
    console.error(error);
    return "Error upload image";
  }
};

// Hàm này để kiểm tra xem string có phải là URL không
const stringIsAValidUrl = (s) => {
  try {
    new URL(s);
    return true;
  } catch (err) {
    return false;
  }
};

// Hàm này để test các method của các controller bằng socket
const handleTestSocket = (io, socket) => {
  const s3 = require("../configs/connectS3");
  let videoChunks = [];
  socket.on("test_socket", async (payload) => {
    console.log(payload);
    const string = payload.string;
    console.log(string);

    const stringIsAValidUrl = (s) => {
      try {
        new URL(s);
        return true;
      } catch (err) {
        return false;
      }
    };
  });
};

module.exports = {
  handleSendFriendRequest,
  handleUserOnline,
  handleLoadConversation,
  handleTestSocket,
  handleSendMessage,
};
