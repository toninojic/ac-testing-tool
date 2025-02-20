const { router, config } = require('../serverConfig');
const { Test } = require('../models/Test');
const { errorLogger } = require('../util/logger');

router.get('/get-all-test', async (req, res) => {
    try {
        const activeTestFound = await Test.getAllActiveTests();
        res.json(activeTestFound);
    } catch (error) {
        const referrer = req.get('Referer') || 'No referrer';
        const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;

        errorLogger.error(`${req.method} REQUEST FROM IP ${clientIP}, URL ${referrer}, ERROR: ${error}`);
    }
});

module.exports = router;
