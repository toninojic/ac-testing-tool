const express = require('express');
const { Test } = require('../models/Test');
const router = express.Router();
const { errorLogger } = require('../util/logger');
const { getClientIp, getReferrer } = require('../middlewares/requestMetadata');

router.get('/get-test', async (req, res) => {
    try {
        const {
            url: REQUESTED_URL,
            actConCookies: ACT_CON_COOKIES
        } = req.query;

        if (!REQUESTED_URL) {
            return res.status(400).json({ error: 'Invalid request parameters' });
        }

        let clientName;
        try {
            const urlObj = new URL(REQUESTED_URL);
            clientName = urlObj.hostname.split('.')[0];
        } catch (e) {
            return res.status(400).json({ error: 'Invalid URL provided' });
        }

        let testsArray = [];

        const testInstance = new Test(req, clientName, ACT_CON_COOKIES);
        const collectedTests = await testInstance.collectTests();

        testsArray.push(...collectedTests);

        return res.json({ testsArray });

    } catch (error) {
        const referrer = getReferrer(req);
        const clientIP = getClientIp(req);

        errorLogger.error(`${req.method} REQUEST FROM IP ${clientIP}, URL ${referrer}, ERROR: ${error}`);

        if (!res.headersSent) {
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});

module.exports = router;
