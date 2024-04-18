const docClient = require("../configs/AWS");
const ConversationModel = require("../models/ConversationModel"); // Add missing import statement
const UserModel = require("../models/UserModel");
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
    return listIDConversation;
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
};

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
const createNewGroupConversation = async (
  IDOwner,
  groupName,
  groupAvatar,
  groupMembers
) => {
  const dataConversation = await createNewInfoConversationGroup(
    groupName,
    groupAvatar,
    IDOwner,
    groupMembers
  );
  const dataMessage = await MessageController.createNewMessage(
    dataConversation.IDConversation
  );
  let res = await Promise.all(
    groupMembers.map(async (member) => {
      dataConversation.IDSender = member;
      return ConversationModel.create(dataConversation);
    })
  );
  return res;
};

const createNewInfoConversationGroup = async (
  groupName,
  groupAvatar,
  IDOwner,
  groupMembers
) => {
  const params = {
    Bucket: "products111",
    Key: uuidv4(),
    Body: groupAvatar,
  };
  return new Promise((resolve, reject) => {
    s3.upload(params, (err, s3Data) => {
      if (err) {
        reject(err);
      } else {
        const urlavatar = s3Data.Location;
        const conversationData = {
          IDConversation: uuidv4(),
          isGroup: true,
          groupName: groupName,
          groupAvatar: urlavatar,
          groupMembers: groupMembers,
          rules: {
            IDOwner: IDOwner,
            listIDCoOwner: [],
          },
        };
        resolve(conversationData);
      }
    });
  });
};

const updateConversation = async (conversation) => {
  const data = ConversationModel.update(conversation);
  return data;
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
        const userSender = await UserModel.get(data.IDSender);
        return {
          ...data,
          userSender: userSender,
        };
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

const addCoOwnerToGroup = async (IDConversation, IDCoOwner) => {
  const listConversation = await getAllConversationByID(IDConversation);
  const list = listConversation.Items || [];
  list.forEach(async (conversation) => {
    let listIDCoOwnerSet = new Set(conversation.rules.listIDCoOwner);
    listIDCoOwnerSet.add(IDCoOwner);
    conversation.rules.listIDCoOwner = Array.from(listIDCoOwnerSet);
    await updateConversation(conversation);
  });
  return "Success";
};
const removeConversationByID = async (IDConversation, IDSender) => {
  const data = await ConversationModel.delete({ IDConversation, IDSender });
  return data;
};

const removeCoOwnerFromGroup = async (IDConversation, IDCoOwner) => {
  const listConversation = await getAllConversationByID(IDConversation);
  const list = listConversation.Items || [];
  list.forEach(async (conversation) => {
    let listIDCoOwnerSet = new Set(conversation.rules.listIDCoOwner);
    listIDCoOwnerSet.delete(IDCoOwner);
    conversation.rules.listIDCoOwner = Array.from(listIDCoOwnerSet);
    await updateConversation(conversation);
  });
  return "Success";
};

const getMemberInfoByIDConversation = async (req, res) => {
  const { IDConversation, IDSender } = req.body;
  const conversation = await ConversationModel.get({
    IDConversation,
    IDSender,
  });

  const conversationRules = conversation?.rules;

  if (conversation) {
    const membersInfo = await Promise.all(
      conversation.groupMembers.map(async (memberID) => {
        let member = await UserModel.get(memberID);
        member = {
          ...member,
          isOwner: false,
          isCoOwner: false,
        };
        // Xử lý thêm để check Trưởng nhóm, phó nhóm trả về client
        if (memberID === conversationRules.IDOwner) {
          member.isOwner = true;
        } else if (conversationRules.listIDCoOwner.includes(memberID)) {
          member.isCoOwner = true;
        }

        return member;
      })
    );
    res.status(200).json(membersInfo);
  } else res.json({ message: "Conversation not found" });
};
const deleteConversationByID = async (IDConversation, IDSender) => {
  const data = await ConversationModel.delete({
    IDConversation: IDConversation,
    IDSender: IDSender,
  });
  return data;
};

const leaveGroup = async (IDConversation, IDSender) => {
  // Xoa conversation cua user
  await deleteConversationByID(IDConversation, IDSender);

  //Xoa thông tin user trong conversation
  const listConversation = await getAllConversationByID(IDConversation);
  const list = listConversation.Items || [];

  list.forEach(async (conversation) => {
    let listMemberSet = new Set(conversation.groupMembers);
    listMemberSet.delete(IDSender);
    conversation.groupMembers = Array.from(listMemberSet);

    // Xoa coowner neu la coowner
    let listIDCoOwnerSet = new Set(conversation.rules.listIDCoOwner);
    listIDCoOwnerSet.delete(IDSender);
    conversation.rules.listIDCoOwner = Array.from(listIDCoOwnerSet);

    await updateConversation(conversation);
  });
  return "Success";
};

const updateInfoGroup = async (IDConversation, groupName, groupAvatar) => {
  const listConversation = await getAllConversationByID(IDConversation);
  const list = listConversation.Items || [];
  let urlavatar;
  if (groupAvatar) {
    const params = {
      Bucket: "products111",
      Key: uuidv4(),
      Body: groupAvatar,
    };
    try {
      const s3Data = await s3.upload(params).promise();
      urlavatar = s3Data.Location;
    } catch (err) {
      console.log(err);
    }
  }

  for (const conversation of list) {
    if (groupName) conversation.groupName = groupName;
    if (groupAvatar) {
      conversation.groupAvatar = urlavatar;
    }
    await updateConversation(conversation);
  }
  return "Success";
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
  getIDConversationByIDUser,
  addCoOwnerToGroup,
  removeCoOwnerFromGroup,
  removeConversationByID,
  getMemberInfoByIDConversation,
  deleteConversationByID,
  leaveGroup,
  updateInfoGroup,
};
