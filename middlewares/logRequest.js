const { accessLogger } = require('../util/logger');
const { getClientIp, getReferrer } = require('./requestMetadata');

const logRequest = (req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
        const referrer = getReferrer(req);
        const clientIP = getClientIp(req);
        accessLogger.info(`${req.method} REQUEST FROM XF IP ${clientIP}, URL ${referrer}`);
    }

    next();
};

module.exports = logRequest;
