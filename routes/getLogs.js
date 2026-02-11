const express = require('express');
const { path, fs } = require('../serverConfig');
const router = express.Router();
const { errorLogger } = require('../util/logger');
const { requirePluginToken } = require('../middlewares/authMiddleware');
const logDirectory = path.join(__dirname, '../logs');
const logPatterns = {
    access: 'access-',
    error: 'error-'
};
router.get('/get-logs', requirePluginToken, (req, res) => {

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
