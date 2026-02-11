const { errorLogger } = require('../util/logger');
const { getClientIp } = require('./requestMetadata');

const getRequiredEnv = (variableName) => {
    const variableValue = process.env[variableName];

    if (!variableValue) {
        throw new Error(`Missing required environment variable: ${variableName}`);
    }

    return variableValue;
};

const ACCESS_TOKEN = getRequiredEnv('ACCESS_TOKEN');
const API_TOKEN = getRequiredEnv('API_TOKEN');

const requirePluginToken = (req, res, next) => {
    const pluginToken = req.headers['x-plugin-token'];
    const clientIP = getClientIp(req);

    if (pluginToken !== ACCESS_TOKEN) {
        errorLogger.error(`${req.path} route access denied due to wrong access token. REQUEST FROM IP ${clientIP}`);
        return res.status(403).send('Forbidden Access!');
    }

    next();
};

const requireBearerToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || authHeader !== `Bearer ${API_TOKEN}`) {
        return res.status(403).json({ error: 'Forbidden: Invalid API token' });
    }

    next();
};

module.exports = {
    requirePluginToken,
    requireBearerToken
};
