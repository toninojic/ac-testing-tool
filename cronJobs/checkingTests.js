const cron = require('node-cron');
const { config, mongoClient } = require("../serverConfig");
const { Test } = require("../models/Test");
const { RedisService } = require("../util/RedisService");

/**
 * Performs the check to archive expired tests.
 */
const performCheck = async () => {
    await Test.archiveExpiredTest(config.testsMainDataPath);
};

/**
 * Fetches active tests from MongoDB and updates the Redis cache.
 * 
 * This function:
 *  - Connects to the 'TestingTool' database.
 *  - Iterates over all collections (each collection representing a client).
 *  - Merges all activeTests found into a single object.
 *  - Retrieves the cached activeTests from Redis (using the default clientName from config).
 *  - For each test in the merged active tests object, if that test is not present in Redis,
 *    it is added. If no activeTests exist in Redis, the entire object is set.
 */
const updateRedisActiveTests = async () => {
    try {
        const db = mongoClient.db('TestingTool');
        const collections = await db.listCollections().toArray();

        // Loop through each collection (each representing a client)
        for (const collection of collections) {
            const clientName = collection.name;
            const clientCollection = db.collection(clientName);
            let allActiveTests = {};

            // Fetch all documents in the current collection that have an activeTests field
            const clientTests = await clientCollection.find({ activeTests: { $exists: true } }).toArray();
            for (const clientTest of clientTests) {
                if (clientTest.activeTests) {
                    // Merge activeTests from this document into a single object for the client.
                    allActiveTests = { ...allActiveTests, ...clientTest.activeTests };
                }
            }

            // Update Redis with the complete activeTests object for the current client.
            await RedisService.setActiveTests(clientName, allActiveTests);
        }
    } catch (error) {
        console.error("Error updating active tests in Redis:", error);
    }
};

/**
 * Schedules two cron jobs:
 * 1. A job that runs on the interval specified in config.testCheckerInterval to archive expired tests.
 * 2. A job that runs every 3 hours to fetch active tests from MongoDB and update Redis with any missing tests.
 */
const scheduleCronJob = () => {
    // Cron job for archiving expired tests
    cron.schedule(config.testCheckerInterval, async () => {
        await performCheck();
    });

    // Cron job every 3 hours to update Redis with active tests from MongoDB
    cron.schedule('0 */3 * * *', async () => {
        await updateRedisActiveTests();
    });
};

module.exports = scheduleCronJob;
