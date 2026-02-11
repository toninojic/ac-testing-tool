const express = require('express');
const router = express.Router();
const { Test } = require('../models/Test');
const { errorLogger } = require('../util/logger');
const { getClientIp, getReferrer } = require('../middlewares/requestMetadata');

router.get('/get-all-test', async (req, res) => {
    try {
        const activeTestFound = await Test.getAllActiveTests();
        res.json(activeTestFound);
    } catch (error) {
        const referrer = getReferrer(req);
        const clientIP = getClientIp(req);

        errorLogger.error(`${req.method} REQUEST FROM IP ${clientIP}, URL ${referrer}, ERROR: ${error}`);
    }
});

module.exports = router;
