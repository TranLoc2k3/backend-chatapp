const express = require('express');
const router = express.Router();
const userController = require('../controllers/User')
const {getUserByID} = require("../controllers/User")

const initApiRoutes = (app) => {
    app.get('/get-all-users', userController.getAllUser)
    return app.use('/', router);
};

module.exports = initApiRoutes;