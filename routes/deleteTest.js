const { router, config } = require('../serverConfig');
const { Test } = require('../models/Test');
const { errorLogger } = require('../util/logger');

router.delete('/delete-test', async (req, res) => {
    const requestBody = req.body;
    const referrer = req.get('Referer') || 'No referrer';
    const clientIP = req.headers['x-forwarded-for'] || req.ip;
    const PLUGIN_TOKEN = process.env.ACCESS_TOKEN;
    const pluginToken = req.headers['x-plugin-token'];

    const {
        id: testID,
        typeOfTest: typeOfTest,
        testName: testName,
        clientName: clientName,
        testStatus: testStatus
    } = requestBody;

    if (pluginToken !== PLUGIN_TOKEN) {
        errorLogger.error(`/delete-test route access denied due to wrong access token. REQUEST FROM IP ${clientIP}`);
        return res.status(403).send('Forbidden Access!');
    }

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
