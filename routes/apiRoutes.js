const express = require('express');
const router = express.Router();
const userController = require('../controllers/UserController')
const {getUserByID} = require("../controllers/UserController")

const initApiRoutes = (app) => {
    app.get('/get-all-users', userController.getAllUser)
    return app.use('/', router);
};

module.exports = initApiRoutes;