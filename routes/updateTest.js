const express = require('express');
const router = express.Router();
const { Test } = require('../models/Test');
const { errorLogger } = require('../util/logger');
const { requirePluginToken } = require('../middlewares/authMiddleware');

router.post('/update-test', requirePluginToken, async (req, res) => {
    const requestBody = req.body;

    try {
        Test.updateTest(requestBody);

        res.send('Test Updated');
    } catch (error) {
        errorLogger.error('Error:', error);
    }
});

module.exports = router;
