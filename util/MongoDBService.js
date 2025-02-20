const { mongoClient, redisClient, enviromentVar } = require('../serverConfig');
const { RedisService } = require('./RedisService');
const { slackMess } = require("../util/slackMess");
const { updatingTestOnTestingInstance } = require('../util/updatingTestOnTestingInstance');

class MongoDBService {
    // Retrieve the database instance once and store it as a static property.
    static db = mongoClient.db('TestingTool');

    /**
     * Retrieves a specific test from MongoDB.
     *
     * @param {string} clientName - The name of the client (also used as the collection name).
     * @param {string} testId - The unique identifier of the test.
     * @param {string} status - The status field under which the test is stored (e.g., "activeTests" or "draftedTests").
     * @returns {Promise<Object>} - Returns a promise that resolves to the test object if found, an empty object if not found,
     *                              or null if an error occurs.
     */
    static async getTest(clientName, testId, status) {
        try {
            const collection = this.db.collection(clientName);
            // Query to find a document with the clientName and the testId under the given status
            const query = { clientName, [`${status}.${testId}`]: { $exists: true } };
            const doc = await collection.findOne(query);
            if (doc && doc[status] && doc[status][testId]) {
                return doc[status][testId];
            }
            return {};
        } catch (error) {
            console.error("MongoDB getTest error:", error);
            return null;
        }
    }

    /**
     * Updates or inserts a test in MongoDB.
     *
     * @param {string} clientName - The name of the client (and collection).
     * @param {string} testId - The unique identifier of the test.
     * @param {Object} testData - The test data to be stored.
     * @param {string} status - The status under which the test is stored (e.g., "activeTests" or "draftedTests").
     * @returns {Promise<void>} - Returns a promise that resolves when the update is complete.
     *
     * This function uses an upsert operation to update an existing test or insert a new one if it does not exist.
     */
    static async updateTest(clientName, testId, testData, status) {
        try {
            const collection = this.db.collection(clientName);
            // Prepare the update query to set the test data under the appropriate status field.
            const updateQuery = { [`${status}.${testId}`]: testData };

            await collection.updateOne({ clientName }, { $set: updateQuery }, { upsert: true });
            if (enviromentVar === 'develop') {
                console.log(`Test ${testId} updated successfully in MongoDB.`);
            }
        } catch (error) {
            console.error("MongoDB update error:", error);
        }
    }

    /**
     * Moves a test from one status to another in MongoDB (typically from activeTests to draftedTests).
     *
     * @param {string} clientName - The name of the client (and collection).
     * @param {string} testId - The unique identifier of the test.
     * @param {string} currentStatus - The current status field where the test is stored (e.g., "activeTests").
     * @param {string} newStatus - The new status field where the test should be moved (e.g., "draftedTests").
     * @returns {Promise<void>} - Returns a promise that resolves when the test is moved.
     *
     * The function first checks if the test exists under the current status, then moves it by unsetting
     * the field from the current status and setting it under the new status.
     */
    static async moveTestToDraft(clientName, testId, currentStatus, newStatus) {
        try {
            const collection = this.db.collection(clientName);

            // Find the document where the test exists under the currentStatus
            const testDoc = await collection.findOne({
                clientName,
                [`${currentStatus}.${testId}`]: { $exists: true }
            });

            if (testDoc && testDoc[currentStatus] && testDoc[currentStatus][testId]) {
                const testData = testDoc[currentStatus][testId];

                await collection.updateOne(
                    { clientName },
                    { 
                        $unset: { [`${currentStatus}.${testId}`]: "" },
                        $set: { [`${newStatus}.${testId}`]: testData }
                    }
                );

                if (enviromentVar === 'develop') {
                    console.log(`Test ${testId} moved to draftedTests in MongoDB.`);
                }
            } else {
                if (enviromentVar === 'develop') {
                    console.log(`Test ${testId} not found in activeTests for client ${clientName}. No changes made.`);
                }
            }
        } catch (error) {
            console.error("MongoDB move to draft error:", error);
        }
    }

    /**
     * Retrieves a list of all active tests across all clients.
     *
     * @returns {Promise<Array>} - Returns a promise that resolves to an array of active test summaries.
     *                             Each summary includes the test's name, duration, url, and clientName.
     *
     * This function iterates over all collections (clients) in the TestingTool database,
     * then finds documents that have an activeTests field, and collects tests that have not expired.
     */
    static async getAllActiveTests() {
        let listOfActiveTests = [];
        try {
            const collections = await this.db.listCollections().toArray();
            
            for (const collection of collections) {
                const clientName = collection.name;
                const clientCollection = this.db.collection(clientName);
                
                // Get all documents that have an activeTests field
                const clientTests = await clientCollection.find({ [`activeTests`]: { $exists: true } }).toArray();
                clientTests.forEach(clientTest => {
                    if (clientTest.activeTests) {
                        Object.values(clientTest.activeTests).forEach(test => {
                            const { name, duration, url } = test.testData;
                            const currentTimestamp = Math.floor(Date.now() / 1000);
                            
                            // Only include tests that have not expired
                            if (duration > currentTimestamp) {
                                listOfActiveTests.push({ name, duration, url, clientName });
                            }
                        });
                    }
                });
            }
        } catch (error) {
            console.error("Error retrieving active tests:", error);
        }
        return listOfActiveTests;
    }

    /**
     * Filters and archives expired tests.
     *
     * @param {string} clientName - The name of the client (and collection).
     * @param {string} testID - The unique identifier of the test.
     * @param {Object} testData - The test data object containing test details.
     * @returns {Promise<void>} - Returns a promise that resolves when the expired test is archived.
     *
     * This function checks if the test has expired (based on its duration compared to the current timestamp).
     * If expired, it moves the test from activeTests to draftedTests in MongoDB, deletes the test from Redis,
     * triggers an update on the testing instance, and sends a Slack notification.
     */
    static async filterAndArchiveExpiredTests(clientName, testID, testData) {
        try {
            const { name, duration, url, origin } = testData.testData;
            const currentTimestamp = Math.floor(Date.now() / 1000);
    
            // Check if the test has expired
            if (duration < currentTimestamp) {
                const collection = this.db.collection(clientName);
                const newStatus = "draftedTests";
                const currentStatus = "activeTests";
    
                // Move test from activeTests to draftedTests in MongoDB
                await collection.updateOne(
                    { clientName },
                    { 
                        $unset: { [`${currentStatus}.${testID}`]: "" },
                        $set: { [`${newStatus}.${testID}`]: testData }
                    }
                );
    
                // Delete the test from Redis (using the constructed key)
                const redisKey = `${clientName}:${currentStatus}:${testID}`;
                await redisClient.del(redisKey);
    
                // Update the testing instance, if applicable
                await updatingTestOnTestingInstance(testID, origin);

                await RedisService.deleteActiveTest(clientName, testID);
    
                // Send a Slack notification about the test being archived
                const testMovedToArchiveMessage = `Test "${name}" with ID ${testID} on site ${url} has expired and been moved to draftedTests in MongoDB and deleted from Redis.`;
                slackMess(testMovedToArchiveMessage).then(r => console.log('Message sent to Slack'));
    
                if (enviromentVar === 'develop') {
                    console.log(`Test ${testID} moved to draftedTests in MongoDB and deleted from Redis.`);
                }
            }
        } catch (error) {
            console.error("Error moving expired test to draftedTests:", error);
        }
    }
}

module.exports = {
    MongoDBService
};
