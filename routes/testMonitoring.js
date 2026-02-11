const { router } = require('../serverConfig');
const { errorLogger } = require('../util/logger');
const { config } = require('../serverConfig');
const { slackMess } = require('../util/slackMess');

const errorCountsMap = new Map();
const exceededLimitSet = new Set();

const API_TOKEN = process.env.API_TOKEN || 'your-secret-token-here';

const resetErrorCount = () => {
    errorCountsMap.clear();
    exceededLimitSet.clear();
};

setInterval(resetErrorCount, config.errorTrackingIntervalDurationInMs);

const errorMessages = {
    1: 'Function execution failed',
    2: 'Selector not found'
};

const authenticateRequest = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || authHeader !== `Bearer ${API_TOKEN}`) {
        return res.status(403).json({ error: 'Forbidden: Invalid API token' });
    }
    next();
};

router.get('/test-monitor', async (req, res) => {
    try {
        const { id, variant, errorcode } = req.query;

        if (!id || !errorcode) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        let errorCount = errorCountsMap.get(id) || 0;
        errorCount++;

        if (errorCount >= config.maximumErrorsPerInterval && !exceededLimitSet.has(id)) {
            exceededLimitSet.add(id);

            const slackMessage = `Test ${id} (variant ${variant}) exceeded allowed errors. Error: ${errorMessages[errorcode] || 'Unknown error'}`;
            slackMess(slackMessage).then(response => {
                if (response) console.log(response);
            });
        }

        errorCountsMap.set(id, errorCount);
        res.json({ message: 'Error recorded', errorCount });
    } catch (error) {
        const referrer = req.get('Referer') || 'No referrer';
        const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;

        errorLogger.error(`${req.method} REQUEST FROM IP ${clientIP}, URL ${referrer}, ERROR: ${error}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
