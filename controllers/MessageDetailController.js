const MessageDetailModel = require("../models/MessageDetailModel");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment-timezone");
const getMessagesDetailByID = async (IDMessageDetail) => {
  const data = await MessageDetailModel.get(IDMessageDetail);
  return data;
};

const removeMessageDetail = async (req, res) => {
  const { IDMessageDetail } = req.body;
  const data = await MessageDetailModel.get(IDMessageDetail);
  if (data) {
    data.isRemove = true;
    const newData = await MessageDetailModel.update(data);
    return res.json(newData);
  }
  return res.json({ message: "Message not found" });
};

const createTextMessageDetail = async (
  IDSender,
  IDConversation,
  textMessage
) => {
  const data = {
    IDMessageDetail: uuidv4(),
    IDSender: IDSender,
    IDConversation: IDConversation,
    type: "text",
    content: textMessage,
    isRemove: false,
    dateTime: moment.tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DDTHH:mm:ss.SSS"),
  };
  const newMessageDetail = MessageDetailModel.create(data);
  return newMessageDetail;
};

const createNewImageMessage = async (IDSender, IDConversation, image) => {
  const data = {
    IDMessageDetail: uuidv4(),
    IDSender: IDSender,
    IDConversation: IDConversation,
    type: "image",
    content: image,
    isRemove: false,
    dateTime: moment.tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DDTHH:mm:ss.SSS"),
  };
  const newMessageDetail = MessageDetailModel.create(data);
  return newMessageDetail;
};

const createNewFileMessage = async (IDSender, IDConversation, image) => {
  const data = {
    IDMessageDetail: uuidv4(),
    IDSender: IDSender,
    IDConversation: IDConversation,
    type: "file",
    content: image,
    isRemove: false,
    dateTime: moment.tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DDTHH:mm:ss.SSS"),
  };
  const newMessageDetail = MessageDetailModel.create(data);
  return newMessageDetail;
};

const createNewVideoMessage = async (IDSender, IDConversation, video) => {
  const data = {
    IDMessageDetail: uuidv4(),
    IDSender: IDSender,
    IDConversation: IDConversation,
    type: "video",
    content: video,
    isRemove: false,
    dateTime: moment.tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DDTHH:mm:ss.SSS"),
  };
  const newMessageDetail = MessageDetailModel.create(data);
  return newMessageDetail;
};

const handleLinkMessage = async (IDSender, IDConversation, link) => {
  const data = {
    IDMessageDetail: uuidv4(),
    IDSender: IDSender,
    IDConversation: IDConversation,
    type: "link",
    content: link,
    isRemove: false,
    dateTime: moment.tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DDTHH:mm:ss.SSS"),
  };
  const newMessageDetail = MessageDetailModel.create(data);
  return newMessageDetail;
};

module.exports = {
  getMessagesDetailByID,
  createTextMessageDetail,
  createNewImageMessage,
  createNewFileMessage,
  createNewVideoMessage,
  handleLinkMessage,
  removeMessageDetail,
};
