const MessageDetailModel = require('../models/MessageDetailModel');

const getMessagesDetailByID = async (IDMessageDetail) => {
    const data = await MessageDetailModel.get(IDMessageDetail);
    return data;
}

module.exports = {
    getMessagesDetailByID
};