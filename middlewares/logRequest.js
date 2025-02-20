const { accessLogger } = require('../util/logger');

const logRequest = (req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
        const referrer = req.get('Referer') || 'No referrer';
        const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
        accessLogger.info(`${req.method} REQUEST FROM XF IP ${clientIP}, URL ${referrer}`);
    }

    next();
};

module.exports = logRequest;
