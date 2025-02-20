const { router, path, fs } = require('../serverConfig');
const { errorLogger } = require('../util/logger');
const logDirectory = path.join(__dirname, '../logs');
const logPatterns = {
    access: 'access-',
    error: 'error-'
};
const PLUGIN_TOKEN = process.env.ACCESS_TOKEN;

router.get('/get-logs', (req, res) => {
    const pluginToken = req.headers['x-plugin-token'];
    const clientIP = req.headers['x-forwarded-for'] || req.ip;

    if (pluginToken !== PLUGIN_TOKEN) {
        errorLogger.error(`/get-logs route access denied due to wrong access token. REQUEST FROM IP ${clientIP}`);
        return res.status(403).send('Forbidden Access!');
    }

    let logObject = {
        'access-logs': '',
        'error-logs': ''
    };

    try {
        const files = fs.readdirSync(logDirectory);

        files.forEach((file) => {
        Object.keys(logPatterns).forEach((key) => {
            if (file.startsWith(logPatterns[key]) && file.endsWith('.log')) {
            const filePath = path.join(logDirectory, file);
            if (fs.existsSync(filePath)) {
                logObject[`${key}-logs`] += fs.readFileSync(filePath, 'utf8') + '\n';
            }
            }
        });
        });

        if (!logObject['access-logs'] && !logObject['error-logs']) {
        errorLogger.error('Log files not found.');
        return res.status(404).json({ error: 'Log files not found.' });
        }

        res.status(200).json(logObject);
    } catch (error) {
        errorLogger.error('Error reading log files:', error);
        res.status(500).json({ error: 'An error occurred while fetching log files.' });
    }
});

module.exports = router;
