const { fs, path, config} = require('../serverConfig');
//const { JSONFileHandler } = require('./JSONFileHandler');
const { slackMess } = require('./slackMess');

const errorCountsMap = new Map();

const resetErrorCount = () => {
    errorCountsMap.forEach((value, key) => {
        errorCountsMap.set(key, 0);
    });
};

setInterval(resetErrorCount, config.errorTrackingIntervalDurationInMs);

const errorHandler = (errMess, invalidTestFileName, invalidTestFolderPath) => {
    let errorCount = errorCountsMap.get(invalidTestFileName) || 0;

    if (errorCount >= config.maximumErrorsPerInterval) {
        const invalidTestPath = path.join(invalidTestFolderPath, invalidTestFileName);
        const testPathInArchivedDIR = invalidTestPath.replace('acTestData', 'archivedTests/acTestData');
        //JSONFileHandler.moveTestToArchiveFolder(invalidTestPath, testPathInArchivedDIR);

        const logFileErrorMessage = `{"Time": "${new Date().toISOString()}","Test called ${invalidTestFileName} was moved to archived folder", "Error": "${errMess}"}`;
        fs.appendFileSync(config.errorLogPath, logFileErrorMessage);

        const slackErrorMessage = `Test with ${invalidTestFileName} ID got too many errors and was turned off by Testing-Tool`;
        slackMess(slackErrorMessage).then(response => {
        if (response) {
            console.log(response);
        }
        });
    }

    errorCount++;
    errorCountsMap.set(invalidTestFileName, errorCount);
};

module.exports = {
  errorHandler
};
