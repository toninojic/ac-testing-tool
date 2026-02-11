const express = require('express');
const router = express.Router();
// My current local Ip needs to be changed to array
const allowedIP = '::1';
const { getClientIp } = require('../middlewares/requestMetadata');

const ipFilter = (req, res, next) => {
    const clientIP = getClientIp(req);
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
