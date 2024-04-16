const docClient = require("../configs/AWS");
const ConversationModel = require("../models/ConversationModel"); // Add missing import statement
const MessageController = require("./MessageController");
const MessageDetailController = require("./MessageDetailController");
const BucketMessageController = require("./BucketMessageController");
const { v4: uuidv4 } = require("uuid");
const s3 = require("../configs/connectS3");
const fs = require("fs");
const { DataPipeline } = require("aws-sdk");

const getConversation = async (IDUser, lastEvaluatedKey) => {
  const params = {
    TableName: "Conversation",
    IndexName: "IDSender-lastChange-index",
    KeyConditionExpression: "IDSender = :sender",
    ExpressionAttributeValues: {
      ":sender": IDUser,
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
    console.log(error);
  }
};

const getIDConversationByIDUser = async (IDUser) => {
    const params = {
      TableName: "Conversation",
      IndexName: "IDSender-lastChange-index",
      KeyConditionExpression: "IDSender = :sender",
      ExpressionAttributeValues: {
        ":sender": IDUser,
      },
      ScanIndexForward: false,
    };
    try {
      const data = await docClient.query(params).promise();
      const listIDConversation = data.Items?.map((item) => item.IDConversation);
      return listIDConversation
    } catch (error) {
      console.log(error);
    }
  };

const getConversationByID = async (IDConversation, IDSender) => {
  // Phai truyen vao IDConversation va IDSender, IDConversation: Parition key, IDSender: Sort key
  const data = await ConversationModel.get({ IDConversation, IDSender });
  return data;
};
const getAllConversationByID = async (IDConversation) => {
  const params = {
    TableName: "Conversation",
    KeyConditionExpression: "IDConversation = :IDConversation",
    ExpressionAttributeValues: {
      ":IDConversation": IDConversation,
    },
  };
  try {
    const data = await docClient.query(params).promise();
    return data;
  } catch (error) {
    console.log(error);
  }

}

const createNewSignleConversation = async (
  IDSender,
  IDReceiver,
  IDConversation
) => {
  const conversation = new ConversationModel({
    IDConversation: IDConversation ? IDConversation : uuidv4(),
    IDSender: IDSender,
    IDReceiver: IDReceiver,
    isGroup: false,
  });
  await conversation.save();
  return conversation;
};

// Tạo thông tin các table của User tạo ra group
const createNewGroupConversation = async ( IDOwner, groupName, groupAvatar, groupMembers) => {
  const dataConversation = await createNewInfoConversationGroup(groupName, groupAvatar, IDOwner, groupMembers);
  const dataMessage = await MessageController.createNewMessage(dataConversation.IDConversation);
  let res = await Promise.all(groupMembers.map(async member => {
    dataConversation.IDSender = member;
    return ConversationModel.create(dataConversation);
  }));
  return res;
}

const createNewInfoConversationGroup = async (groupName, groupAvatar, IDOwner, groupMembers) => {
  const params = {
    Bucket: 'products111',
    Key: uuidv4(),
    Body: groupAvatar,
  };
  return new Promise((resolve, reject) => {
    s3.upload(params, (err, s3Data) => {
      if (err) {
        reject(err);
      }
      else {
        const urlavatar = s3Data.Location;
        const conversationData = {
          IDConversation: uuidv4(),
          isGroup: true,
          groupName: groupName,
          groupAvatar: urlavatar,
          groupMembers: groupMembers,
          rules: {
            IDOwner: IDOwner,
            listIDCoOwner: []
          }
        }
        resolve(conversationData);
      }
    });
  });
}

const updateConversation = async (conversation) => {
  await conversation.save();
  return conversation;
};

const getMessageDetailByIDConversation = async (req, res) => {
  // const IDConversation = req.body.IDConversation;
  // Truyen IDNextBucket để load tin nhắn tiếp theo, có thể không truyền trong lần đầu, chỉ cần truyền IDConversation
  const { IDConversation, IDNextBucket } = req.body;
  let listIDMessageDetail, dataBucketMessage;

  if (IDNextBucket) {
    dataBucketMessage = await BucketMessageController.getBucketMessageByID(
      IDNextBucket
    );
    listIDMessageDetail = dataBucketMessage.listIDMessageDetail;
  } else {
    const dataMessage = await MessageController.getMessageByID(IDConversation);
    const IDBucketMessage = dataMessage.IDNewestBucket;
    dataBucketMessage = await BucketMessageController.getBucketMessageByID(
      IDBucketMessage
    );
    listIDMessageDetail = dataBucketMessage.listIDMessageDetail;
  }

  if (listIDMessageDetail) {
    const listMessageDetail = await Promise.all(
      listIDMessageDetail.map(async (IDMessageDetail) => {
        const data = await MessageDetailController.getMessagesDetailByID(
          IDMessageDetail
        );
        return data;
      })
    );
    listMessageDetail.reverse();
    const result = {
      listMessageDetail: listMessageDetail,
      IDNextBucket: dataBucketMessage.IDNextBucket,
    };
    return res.status(200).json(result);
  }
  return res.status(200).json({ message: "No message detail" });
};

module.exports = {
  getConversation,
  getConversationByID,
  getAllConversationByID,
  createNewSignleConversation,
  updateConversation,
  getMessageDetailByIDConversation,
  createNewGroupConversation,
  createNewInfoConversationGroup,
  getIDConversationByIDUser
};
