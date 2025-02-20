const { errorLogger } = require('../util/logger');

const authMiddleware = (req, res, next) => {
    const pluginToken = req.headers['x-plugin-token'];
    const clientIP = req.headers['x-forwarded-for'] || req.ip;

    if (pluginToken !== process.env.ACCESS_TOKEN) {
        errorLogger.error(`/get-logs route access denied due to wrong access token. REQUEST FROM IP ${clientIP}`);
        return res.status(403).send('Forbidden Access!');
    }

    next();
}

module.exports = authMiddleware;