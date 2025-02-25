const { app, port, router } = require('../serverConfig');
const getTest = require('../routes/getTest');
const getAllTest = require('../routes/getAllTests');
const updateTest = require('../routes/updateTest');
const deleteTest = require('../routes/deleteTest');
const testMonitoring = require('../routes/testMonitoring');
const healthCheck = require('../routes/healthCheck');
const getLogs = require('../routes/getLogs');
const { accessLogger } = require('../util/logger');

const checkingTests = require('../cronJobs/checkingTests');
if (process.env.NODE_ENV != 'production') {
    app.use((req, res, next) => {
        const referrer = req.get('Referer') || 'No referrer';
        const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;

        accessLogger.info(`${req.method} REQUEST FROM XF IP ${clientIP}, URL ${referrer}`);
        next();
    });
}

app.use(getTest);
app.use(getAllTest);
app.use(updateTest);
app.use(deleteTest);
app.use(testMonitoring);
app.use(healthCheck);
app.use(getLogs);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

checkingTests();
