const { router, config } = require('../serverConfig');
const { Test } = require('../models/Test');
const { errorLogger } = require('../util/logger');

const PLUGIN_TOKEN = process.env.ACCESS_TOKEN;

router.post('/update-test', async (req, res) => {
    const requestBody = req.body;
    const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
    const pluginToken = req.headers['x-plugin-token'];

    if (pluginToken !== PLUGIN_TOKEN) {
        errorLogger.error(`/update-test route access denied due to wrong access token. REQUEST FROM IP ${clientIP}`);
        return res.status(403).send('Forbidden Access!');
    }

    try {
        Test.updateTest(requestBody);

        res.send('Test Updated');
    } catch (error) {
        errorLogger.error('Error:', error);
    }
});

module.exports = router;
