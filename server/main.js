const { app, port } = require('../serverConfig');
const getTest = require('../routes/getTest');
const previewTest = require('../routes/previewTest');
const getAllTest = require('../routes/getAllTests');
const updateTest = require('../routes/updateTest');
const deleteTest = require('../routes/deleteTest');
const testMonitoring = require('../routes/testMonitoring');
const healthCheck = require('../routes/healthCheck');
const getLogs = require('../routes/getLogs');
const logRequest = require('../middlewares/logRequest');

const checkingTests = require('../cronJobs/checkingTests');
app.use(logRequest);

app.use(getTest);
app.use(previewTest);
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
