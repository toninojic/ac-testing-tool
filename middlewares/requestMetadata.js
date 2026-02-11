const getClientIp = (req) => {
    const forwardedForHeader = req.headers['x-forwarded-for'];

    if (typeof forwardedForHeader === 'string' && forwardedForHeader.length > 0) {
        return forwardedForHeader.split(',')[0].trim();
    }

    return req.socket?.remoteAddress || req.ip || 'unknown-ip';
};

const getReferrer = (req) => req.get('Referer') || 'No referrer';

module.exports = {
    getClientIp,
    getReferrer
};
