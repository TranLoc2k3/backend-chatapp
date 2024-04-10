const BucketMessageModel = require('../models/BucketMessageModel');
const { v4: uuidv4 } = require('uuid');
const getBucketMessageByID = async (IDBucketMessage) => {
    const data = await BucketMessageModel.get(IDBucketMessage);
    return data;
}

const createBucketMessage = async (bucket) => {
    const data = await BucketMessageModel.create(bucket);
    return data;
}

const updateBucketMessage = async (bucket) => { 
    const data = await BucketMessageModel.update(bucket);
    return data;

}
const createNewBucketMessage = async () => {
    const dataBucket = {
        IDBucketMessage: uuidv4(),
        listIDMessageDetail: [],
        IDNextBucket: ""
    }
    const bucket = await BucketMessageModel.create(dataBucket);
    return bucket;
}

module.exports = {
    getBucketMessageByID,
    createBucketMessage,
    updateBucketMessage,
    createNewBucketMessage
};