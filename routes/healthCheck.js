const { router} = require('../serverConfig');
// My current local Ip needs to be changed to array
const allowedIP = '::1';

const ipFilter = (req, res, next) => {
    const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
    if (clientIP === allowedIP || clientIP === `::ffff:${allowedIP}`) {
        next();
    } else {
        res.status(403).send('Node.js application is running but access denied');
    }
};

router.get('/health', ipFilter, (req, res) => {
    res.status(200).send('Node.js application is running');
});



module.exports = router;
