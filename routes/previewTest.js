const { Test } = require('../models/Test');
const { router } = require('../serverConfig');
const { errorLogger } = require('../util/logger');

router.get('/get-test-variation', async (req, res) => {
    try {
        const {
            url: REQUESTED_URL,
            id: TEST_ID,
            v: TEST_V,
            previewWithOthers: PREVIEW_WITH_OTHERS,
            actConCookies: ACT_CON_COOKIES
        } = req.query;

        if (!REQUESTED_URL || !TEST_ID || !TEST_V) {
            return res.status(400).json({ error: 'Invalid request parameters' });
        }

        let clientName;
        try {
            const urlObj = new URL(REQUESTED_URL);
            clientName = urlObj.hostname.split('.')[0];
        } catch (e) {
            return res.status(400).json({ error: 'Invalid URL provided' });
        }

        const testInstance = new Test(req, clientName, ACT_CON_COOKIES);
        const testsArray = await testInstance.collectPreviewTests(TEST_ID, TEST_V, PREVIEW_WITH_OTHERS);

        return res.json({ testsArray });
    } catch (error) {
        const referrer = req.get('Referer') || 'No referrer';
        const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
        errorLogger.error(`${req.method} REQUEST FROM IP ${clientIP}, URL ${referrer}, ERROR: ${error}`);
        if (!res.headersSent) {
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});

module.exports = router;
