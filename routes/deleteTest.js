const express = require('express');
const router = express.Router();
const { Test } = require('../models/Test');
const { errorLogger } = require('../util/logger');
const { requirePluginToken } = require('../middlewares/authMiddleware');
const { getClientIp, getReferrer } = require('../middlewares/requestMetadata');

router.delete('/delete-test', requirePluginToken, async (req, res) => {
    const requestBody = req.body;
    const referrer = getReferrer(req);
    const clientIP = getClientIp(req);

    const {
        id: testID,
        typeOfTest: typeOfTest,
        testName: testName,
        clientName: clientName,
        testStatus: testStatus
    } = requestBody;

    if (clientName === '' || testID === '') {
        errorLogger.error(`${req.method} REQUEST FROM IP ${clientIP}, URL ${referrer}, ERROR: You need to set up valid test data`);
        res.send('You need to set up valid test data');
        return;
    }

    try {
        Test.deleteTest(testID, testName, clientName, testStatus, req);

        res.send('Test Moved To Archived Folder');
    } catch (error) {
        errorLogger.error(`${req.method} REQUEST FROM IP ${clientIP}, URL ${referrer}, ERROR: Error deleting test. ${error}.`);

    }
});

module.exports = router;
