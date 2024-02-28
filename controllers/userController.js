const UserModel = require('../models/UserModel');
const getAllUser = async (req, res) => {
    try {
      const data = await UserModel.scan().exec()
      return res.status(200).json(data);
    } catch (err) {
      return res.status(200).json({ errCode: -1, errMessage: 'Server error!' });
    }
  };

module.exports = {
    getAllUser
}
