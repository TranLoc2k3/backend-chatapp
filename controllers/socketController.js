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
const MessageDetailModel = require("../models/MessageDetailModel");
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

const getUserBySocketId = (socketId) => {
  return onlineUsers.find((user) => user.socketId === socketId);
};

const handleUserOnline = (socket) => {
  socket.on("new user connect", async (payload) => {
    addNewUser(payload.phone, socket.id);
    //Thêm IDConversation của User vào tất cả các room socket
    const listIDConversation =
      await conversationController.getIDConversationByIDUser(payload.phone);
    if (listIDConversation) {
      listIDConversation.forEach(async (IDConversation) => {
        socket.join(IDConversation);
      });
    }
  });
  socket.on("disconnect", async () => {
    //Xoá IDConversation của User tất cả các room socket
    const user = getUserBySocketId(socket.id);
    const userPhone = user.phone;
    const listIDConversation =
      await conversationController.getIDConversationByIDUser(userPhone);
    listIDConversation.forEach(async (IDConversation) => {
      socket.leave(IDConversation);
    });
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

const handleChangeStateMessage = async (io, socket) => {
  socket.on("recallMessage", async (payload) => {
    // Có sự thay đổi trong payload, không cần gửi IDReceiver nữa
    const { IDMessageDetail } = payload;
    const message = await MessageDetailController.getMessagesDetailByID(
      IDMessageDetail
    );
    if (message) {
      message.isRecall = true;
      const newMessage = await MessageDetailModel.update(message);

      // const user = getUser(IDReceiver);
      // if (user?.socketId) {
      //   io.to(user.socketId).emit("changeStateMessage", newMessage);
      // }
      io.to(message.IDConversation).emit("changeStateMessage", newMessage);
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
        } else {
        }
      })
    );
    res = listConversationDetails2;
    listConversationDetails2.forEach((conversation) => {
      socket.join(conversation.IDConversation);
    });

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

        io.to(dataConversation.IDConversation).emit(
          "receive_message",
          videoMessage
        );

        updateLastChangeConversation(
          payload.IDConversation,
          videoMessage.IDMessageDetail
        );
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

      io.to(dataConversation.IDConversation).emit(
        "receive_message",
        dataImageMessage
      );

      updateLastChangeConversation(
        payload.IDConversation,
        dataImageMessage.IDMessageDetail
      );
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

      io.to(dataConversation.IDConversation).emit(
        "receive_message",
        dataFileMessage
      );

      updateLastChangeConversation(
        payload.IDConversation,
        dataFileMessage.IDMessageDetail
      );
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

        io.to(dataConversation.IDConversation).emit(
          "receive_message",
          linkmessage
        );

        updateLastChangeConversation(
          payload.IDConversation,
          linkmessage.IDMessageDetail
        );
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

      io.to(dataConversation.IDConversation).emit(
        "receive_message",
        textmessage
      );

      updateLastChangeConversation(
        payload.IDConversation,
        textmessage.IDMessageDetail
      );
    }
  });
};

const updateLastChangeConversation = async (
  IDConversation,
  IDNewestMessage
) => {
  const listConversation =
    (await conversationController.getAllConversationByID(IDConversation)) || [];
  const list = listConversation.Items || [];
  list.forEach(async (conversation) => {
    conversation.lastChange = moment
      .tz("Asia/Ho_Chi_Minh")
      .format("YYYY-MM-DDTHH:mm:ss.SSS");
    conversation.IDNewestMessage = IDNewestMessage;
    const ConversationModel = require("../models/ConversationModel");
    const updateConversation = await ConversationModel.update(conversation);
  });
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
  const params = {
    Bucket: "imagetintin",
    Key: uuidv4(),
    Body: image,
  };
  try {
    const data = await s3.upload(params).promise();
    const imageMessage = await MessageDetailController.createNewImageMessage(
      IDSender,
      IDConversation,
      data.Location
    );
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

const handleCreatGroupConversation = (io, socket) => {
  socket.on("create_group_conversation", async (payload) => {
    // groupMembers phải có cả IDOwner
    const { IDOwner, groupName, groupMembers } = payload;
    const groupAvatar = payload.groupAvatar;

    const dataConversation =
      await conversationController.createNewGroupConversation(
        IDOwner,
        groupName,
        groupAvatar,
        groupMembers
      );
    groupMembers.forEach(async (member) => {
      const user = getUser(member);
      if (user?.socketId) {
        io.to(user.socketId).emit(
          "new_group_conversation",
          "Load conversation again!"
        );
      }
    });
  });
};

// Hàm này để test các method của các controller bằng socket
const handleTestSocket = async (io, socket) => {};

module.exports = {
  handleSendFriendRequest,
  handleUserOnline,
  handleLoadConversation,
  handleTestSocket,
  handleSendMessage,
  handleChangeStateMessage,
};
