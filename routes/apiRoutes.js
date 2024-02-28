const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController')

const initApiRoutes = (app) => {
    app.get('/get-all-users', userController.getAllUser)

    return app.use('/', router);
};

module.exports = initApiRoutes;