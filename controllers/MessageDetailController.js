const MessageDetailModel = require('../models/MessageDetailModel');
const { v4: uuidv4 } = require('uuid');
const getMessagesDetailByID = async (IDMessageDetail) => {
    const data = await MessageDetailModel.get(IDMessageDetail);
    return data;
}

const createTextMessageDetail = async (IDSender, IDConversation, textMessage) => {
    const data = {
        IDMessageDetail: uuidv4(),
        IDSender: IDSender,
        type: 'text',
        content: textMessage,
        isRemove: false
    }
    const newMessageDetail = MessageDetailModel.create(data);
    return newMessageDetail;
}

const createNewImageMessage = async (IDSender, IDConversation, image) => {
    const data = {
        IDMessageDetail: uuidv4(),
        IDSender: IDSender,
        type: 'image',
        content: image,
        isRemove: false
    }
    const newMessageDetail = MessageDetailModel.create(data);
    return newMessageDetail;
}

module.exports = {
    getMessagesDetailByID,
    createTextMessageDetail,
    createNewImageMessage
};