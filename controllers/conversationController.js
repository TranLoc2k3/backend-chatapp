const docClient = require("../configs/AWS")
const ConversationModel = require("../models/ConversationModel"); // Add missing import statement
const { v4: uuidv4 } = require('uuid');

const getConversation = async (IDUser, lastEvaluatedKey) => {
    const params = {
        TableName: 'Conversation',
        IndexName: 'IDSender-lastChange-index',
        KeyConditionExpression: 'IDSender = :sender',
        ExpressionAttributeValues: {
            ':sender': IDUser
        },
        ScanIndexForward: false,
        Limit: 10,
    };
    if (lastEvaluatedKey) {
        params.ExclusiveStartKey = lastEvaluatedKey;
    }

    try {
        const data = await docClient.query(params).promise();
        return data;
    } catch (error) {
        console.log(error)
    }
};


const getConversationByID = async (IDConversation, IDSender) => {
    // Phai truyen vao IDConversation va IDSender, IDConversation: Parition key, IDSender: Sort key
    const data = await ConversationModel.get({"IDConversation": IDConversation, "IDSender": IDSender})
    return data;
};


const createNewSignleConversation = async (IDSender, IDReceiver, IDConversation) => {
    const conversation = new ConversationModel({
        IDConversation: IDConversation ? IDConversation : uuidv4(),
        IDSender: IDSender,
        IDReceiver: IDReceiver,
        isGroup: false,
    });
    await conversation.save();
    return conversation;
}


module.exports = {
    getConversation,
    getConversationByID,
    createNewSignleConversation
};