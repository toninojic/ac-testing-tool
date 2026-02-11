const { mongoClient, enviromentVar } = require('../serverConfig');
const { MongoDBService } = require("../util/MongoDBService");
const { RedisService } = require("../util/RedisService");
const { UserSegmentation } = require("../util/UserSegmentation");
const { trackingScriptsHandler } = require("../controllers/trackingScriptsHandler");
// Add error handler
const { errorHandler } = require('../util/errorHandler');
const { slackMess } = require("../util/slackMess");
const { errorLogger } = require('../util/logger');

class Test {
    /**
     * Constructor for the Test class.
     *
     * @param {Object} req - The HTTP request object.
     * @param {string} testsClientName - The name of the client (used as the collection name and Redis key prefix).
     * @param {string} actConCookies - The active cookies (typically a JSON string) used to determine returning users.
     */
    constructor(req, testsClientName, actConCookies) {
        this.testsArray = [];
        this.req = req;
        this.clientName = testsClientName;
        this.actConCookies = actConCookies;
        this.controlVariationName = 'control';
    }

    /**
     * First, try to retrieve activeTests from Redis.
     * If they are not found in Redis, fetch them from MongoDB and save them to Redis.
     * For each test in activeTests, call prepareAndReturnTestData.
     *
     * @returns {Promise<Array>} - A promise that resolves to an array of processed test objects.
     */
    async collectTests() {
        const referrer = this.req.get('Referer') || 'No referrer';
        const clientIP =
            this.req.headers['x-forwarded-for'] ||
            this.req.socket.remoteAddress ||
            this.req.ip;
        let currentlyCollectedTestsArray = [];

        try {
            // 1. Try to get activeTests from Redis for the given clientName.
            const cachedActiveTests = await RedisService.getActiveTests(this.clientName);
            if (cachedActiveTests) {
                for (const [testId, testData] of Object.entries(cachedActiveTests)) {
                    const formattedTest = await this.prepareAndReturnTestData(testData, testId);
                    // If the test should not be loaded, skip it.
                    if (formattedTest.shouldTestLoad === false) continue;
                    currentlyCollectedTestsArray.push(formattedTest);
                }
                return currentlyCollectedTestsArray;
            }

            // 2. If activeTests are not found in Redis, get them from MongoDB.
            const db = mongoClient.db('TestingTool');
            const collection = db.collection(this.clientName);
            const clientTests = await collection.find({ activeTests: { $exists: true } }).toArray();

            let activeTests = {};
            for (const clientTest of clientTests) {
                if (clientTest.activeTests) {
                    // Merge activeTests from all documents (if multiple exist)
                    activeTests = { ...activeTests, ...clientTest.activeTests };

                    for (const [testId, testData] of Object.entries(clientTest.activeTests)) {
                        const formattedTest = await this.prepareAndReturnTestData(testData, testId);
                        if (formattedTest.shouldTestLoad === false) continue;
                        currentlyCollectedTestsArray.push(formattedTest);
                    }
                }
            }

            // Save the entire activeTests object into Redis for future requests.
            await RedisService.setActiveTests(this.clientName, activeTests);

            return currentlyCollectedTestsArray;
        } catch (error) {
            errorLogger.error(
                `${this.req.method} REQUEST FROM IP ${clientIP}, URL ${referrer}. Error accessing test data. ${error}`
            );
            return currentlyCollectedTestsArray;
        }
    }

    /**
     * Processes a single test.
     * - Checks user segmentation.
     * - If the user is a returning user, returns the previously assigned variation.
     * - If the user is new, assigns a variation using variationHandlerWithProbability.
     *
     * @param {Object} testDataObject - The test data object retrieved from MongoDB/Redis.
     * @param {string} testID - The unique identifier of the test.
     * @returns {Promise<Object>} - A promise that resolves to an object containing processed test details.
     */
    async prepareAndReturnTestData(testDataObject, testID) {
        const { testData, userSegmentation, trackingGoals, testResources } = testDataObject;
        const cookieValues = this.actConCookies ? JSON.parse(this.actConCookies) : [];

        let variationData;
        let variationServed;
        let isReturningUser = false;

        // Check if the user meets the segmentation criteria.
        const isSegmentedUser = new UserSegmentation(this.req, userSegmentation).isSegmentedUser();
        if (!isSegmentedUser) {
            return { shouldTestLoad: false };
        }

        // Check if the user is a returning user based on cookies.
        for (const cookie of cookieValues) {
            const [cookieKey, cookieValue] = cookie.split(':');
            if (testData.id === cookieKey.trim()) {
                let returningUserStatus = cookieValue.trim();
                if (returningUserStatus === 'not_allocated') {
                    return {
                        id: testData.id,
                        userAllocated: false,
                        testDuration: testData.duration,
                        variationServed: this.controlVariationName
                    };
                }
                variationData = this.handleReturningUsers(returningUserStatus, testResources);
                variationServed = returningUserStatus;
                isReturningUser = true;
                break;
            }
        }

        // For new users, assign a variation based on probability.
        if (!isReturningUser) {
            const currentVariation = this.variationHandlerWithProbability(testResources);
            variationData = currentVariation.servedVariationData;
            variationServed = currentVariation.servedVariationKey;
        }

        // Generate tracking scripts based on tracking goals.
        const trackingScripts = trackingScriptsHandler(trackingGoals, variationServed, testData);

        return {
            id: testData.id,
            testDuration: testData.duration,
            variation: variationData,
            trackingScripts: trackingScripts,
            variationServed: variationServed
        };
    }

    /**
     * Returns the previously assigned variation for a returning user.
     *
     * @param {string} variationServed - The variation key previously served to the user.
     * @param {Array} testResources - The list of test variations/resources.
     * @returns {Object|string} - The previously assigned variation data, or the control variation if not applicable.
     */
    handleReturningUsers(variationServed, testResources) {
        let previouslyServedVariationData = this.controlVariationName;
        if (parseInt(variationServed) !== 0) {
            previouslyServedVariationData = testResources[parseInt(variationServed) - 1];
        }
        return previouslyServedVariationData;
    }

    /**
     * Assigns a variation for a new user using probability.
     *
     * @param {Array} testResources - The list of test variations/resources.
     * @returns {Object} - An object containing the served variation key and the corresponding variation data.
     *
     * The function calculates a random percentage and iterates through the test resources,
     * summing the allocation percentages until it determines which variation to serve.
     */
    variationHandlerWithProbability(testResources) {
        let servedVariationKey = 0;
        let servedVariationData = this.controlVariationName;
        const randomPercentage = Math.random() * 100;
        let cumulativeTraffic = 0;

        for (let i = 0; i < testResources.length; i++) {
            cumulativeTraffic += parseFloat(testResources[i].ac_test_variation_traffic_allocation);
            if (randomPercentage <= cumulativeTraffic) {
                servedVariationKey = i + 1;
                servedVariationData = testResources[i];
                break;
            }
        }
        return {
            servedVariationKey,
            servedVariationData
        };
    }

    /**
     * Retruns test which user will demand
     * 
     * @param {string} TEST_ID 
     * @param {string} TEST_V 
     * @param {string} PREVIEW_WITH_OTHERS 
     * @returns {Array}
     */
    async collectPreviewTests(TEST_ID, TEST_V, PREVIEW_WITH_OTHERS) {
        let previewTestsArray = [];
        try {
            // 1. Try to get activeTests from Redis for the given clientName.
            const cachedActiveTests = await RedisService.getActiveTests(this.clientName);
            if (cachedActiveTests) {
                // For multiple tests
                if (PREVIEW_WITH_OTHERS === 'true' || PREVIEW_WITH_OTHERS === true) {
                    for (const [testId, testData] of Object.entries(cachedActiveTests)) {
                        const formattedTest = await this.prepareAndReturnTestDataPreview(testData, testId, TEST_ID, TEST_V);
                        if (formattedTest.shouldTestLoad === false) continue;
                        previewTestsArray.push(formattedTest);
                    }
                } else {
                    // For only one test
                    if (cachedActiveTests[TEST_ID]) {
                        const formattedTest = await this.prepareAndReturnTestDataPreview(cachedActiveTests[TEST_ID], TEST_ID, TEST_ID, TEST_V);
                        if (formattedTest.shouldTestLoad !== false) previewTestsArray.push(formattedTest);
                    }
                }
                return previewTestsArray;
            }

            
            // 2. If activeTests are not found in Redis, get them from MongoDB.
            const db = mongoClient.db('TestingTool');
            const collection = db.collection(this.clientName);
            // For multiple tests
            if (PREVIEW_WITH_OTHERS === 'true' || PREVIEW_WITH_OTHERS === true) {
                const clientTests = await collection.find({ activeTests: { $exists: true } }).toArray();
                for (const clientTest of clientTests) {
                    if (clientTest.activeTests) {
                        for (const [testId, testData] of Object.entries(clientTest.activeTests)) {
                            const formattedTest = await this.prepareAndReturnTestDataPreview(testData, testId, TEST_ID, TEST_V);
                            if (formattedTest.shouldTestLoad === false) continue;
                            previewTestsArray.push(formattedTest);
                        }
                    }
                }
            } else {
                // For only one test
                const clientTests = await collection.find({ activeTests: { $exists: true } }).toArray();
                for (const clientTest of clientTests) {
                    if (clientTest.activeTests && clientTest.activeTests[TEST_ID]) {
                        const formattedTest = await this.prepareAndReturnTestDataPreview(clientTest.activeTests[TEST_ID], TEST_ID, TEST_ID, TEST_V);
                        if (formattedTest.shouldTestLoad !== false) previewTestsArray.push(formattedTest);
                    }
                }
            }
            return previewTestsArray;
        } catch (error) {
            errorLogger.error(`Error in collectPreviewTests: ${error}`);
            return previewTestsArray;
        }
    }

    /**
     * Processes a rest of the tests. If all tests are needed for preview
     * - Checks user segmentation.
     * - If the user is a returning user, returns the previously assigned variation.
     * - If the user is new, assigns a variation using variationHandlerWithProbability.
     *
     * @param {Object} testDataObject 
     * @param {string} testID 
     * @param {string} previewTestID 
     * @param {string} previewVariationValue 
     * @returns {Promise<Object>}
     */
    async prepareAndReturnTestDataPreview(testDataObject, testID, previewTestID, previewVariationValue) {
        const { testData, userSegmentation, trackingGoals, testResources } = testDataObject;
        const cookieValues = this.actConCookies ? JSON.parse(this.actConCookies) : [];

        const isSegmentedUser = new UserSegmentation(this.req, userSegmentation).isSegmentedUser();
        if (!isSegmentedUser) {
            return { shouldTestLoad: false };
        }

        let variationData;
        let variationServed;
        let isReturningUser = false;

        if (testID === previewTestID) {
            if (parseInt(previewVariationValue) && parseInt(previewVariationValue) !== 0) {
                variationData = testResources[parseInt(previewVariationValue) - 1];
            } else {
                variationData = this.controlVariationName;
            }
            variationServed = previewVariationValue;
        } else {
            for (const cookie of cookieValues) {
                const [cookieKey, cookieValue] = cookie.split(':');
                if (testData.id === cookieKey.trim()) {
                    let returningUserStatus = cookieValue.trim();
                    if (returningUserStatus === 'not_allocated') {
                        return {
                            id: testData.id,
                            userAllocated: false,
                            testDuration: testData.duration,
                            variationServed: this.controlVariationName
                        };
                    }
                    variationData = this.handleReturningUsers(returningUserStatus, testResources);
                    variationServed = returningUserStatus;
                    isReturningUser = true;
                    break;
                }
            }
            if (!isReturningUser) {
                const currentVariation = this.variationHandlerWithProbability(testResources);
                variationData = currentVariation.servedVariationData;
                variationServed = currentVariation.servedVariationKey;
            }
        }

        const trackingScripts = trackingScriptsHandler(trackingGoals, variationServed, testData);

        return {
            id: testData.id,
            testDuration: testData.duration,
            variation: variationData,
            trackingScripts: trackingScripts,
            variationServed: variationServed
        };
    }
    
    /**
     * Archives expired tests.
     *
     * Iterates through all client collections, retrieves activeTests, and for each test,
     * calls MongoDBService.filterAndArchiveExpiredTests to move expired tests from activeTests
     * to draftedTests in MongoDB.
     *
     * @returns {Promise<void>}
     */
    static async archiveExpiredTest() {
        try {
            const db = mongoClient.db('TestingTool');
            const collections = await db.listCollections().toArray();

            for (const collection of collections) {
                const clientName = collection.name;
                const clientCollection = db.collection(clientName);
                
                // Get all active tests
                const clientTests = await clientCollection.find({ [`activeTests`]: { $exists: true } }).toArray();
                
                for (const clientTest of clientTests) {
                    if (clientTest.activeTests) {
                        for (const [testID, test] of Object.entries(clientTest.activeTests)) {
                            await MongoDBService.filterAndArchiveExpiredTests(clientName, testID, test);
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error archiving expired tests:", error);
        }
    }

    /**
     * Retrieves all active tests.
     *
     * @returns {Promise<Array>} - A promise that resolves to an array of active test summaries.
     *
     * This static method simply calls MongoDBService.getAllActiveTests to retrieve the tests.
     */
    static async getAllActiveTests() {
        return await MongoDBService.getAllActiveTests();
    }

    /**
     * Updates a test in MongoDB and optionally updates the corresponding Redis activeTests object.
     *
     * @param {Object} requestBody - The request body containing testData, testResources, etc.
     * @returns {Promise<void>}
     *
     * The function converts the test duration, calculates cumulative traffic for variations,
     * updates the test in MongoDB, and if the test is active, updates the test within the Redis activeTests object.
     */
    static async updateTest(requestBody) {
        const clientName = requestBody.testData.clientName;
        const status = requestBody.testData.status === "publish" ? "activeTests" : "draftedTests";
        const testId = requestBody.testData.id;
    
        // Convert the test duration to seconds.
        requestBody.testData.duration = Math.floor(new Date(requestBody.testData.duration).getTime() / 1000);
    
        // Calculate cumulative traffic allocation for test variations.
        let cumulativeTraffic = 0;
        for (let i = 0; i < requestBody.testResources.length; i++) {
            cumulativeTraffic += parseInt(requestBody.testResources[i].ac_test_variation_traffic_allocation, 10);
            requestBody.testResources[i].sumOfTrafficAllocation = cumulativeTraffic;
        }
    
        try {
            // Update the test in MongoDB.
            await MongoDBService.updateTest(clientName, testId, requestBody, status);
          
            // Optionally update Redis activeTests if the test is active.
            if (status === "activeTests") {
                // Retrieve the existing activeTests object from Redis.
                let activeTests = await RedisService.getActiveTests(clientName);
                if (activeTests) {
                    // Update the specific test in the activeTests object.
                    activeTests[testId] = requestBody;
                    await RedisService.setActiveTests(clientName, activeTests);
                    if (enviromentVar === 'develop') {
                        console.log(`Test ${testId} updated successfully in Redis.`);
                    }
                } else {
                    // If there is no activeTests object, create one with the updated test.
                    activeTests = { [testId]: requestBody };
                    await RedisService.setActiveTests(clientName, activeTests);
                    if (enviromentVar === 'develop') {
                        console.log(`Active tests created in Redis with test ${testId}.`);
                    }
                }
            }
        } catch (error) {
            console.error("Error updating test:", error);
        }
    }

    /**
     * Deletes a test by moving it from activeTests to draftedTests in MongoDB and removing it from Redis.
     *
     * @param {string} testID - The unique identifier of the test.
     * @param {string} testName - The name of the test.
     * @param {string} clientName - The client name.
     * @param {string} testStatus - The current status of the test.
     * @param {Object} req - The HTTP request object.
     * @returns {Promise<void>}
     *
     * This method calls MongoDBService.moveTestToDraft to move the test in MongoDB,
     * then removes the test from the Redis activeTests object using RedisService.deleteActiveTest.
     * Finally, it sends a Slack notification.
     */
    static async deleteTest(testID, testName, clientName, testStatus, req) {
        const newStatus = "draftedTests";
        const currentStatus = "activeTests";
    
        try {
            // Move the test from activeTests to draftedTests in MongoDB.
            await MongoDBService.moveTestToDraft(clientName, testID, currentStatus, newStatus);

            // Delete the test from the Redis activeTests object.
            await RedisService.deleteActiveTest(clientName, testID);
    
            const testMovedMessage = `Test "${testName}" with ID ${testID} on site ${clientName} has been moved to draftedTests in MongoDB and deleted from Redis`;
            slackMess(testMovedMessage).then(response => {
                if (response) {
                    if (enviromentVar === 'develop') {
                        console.log(response);
                    }
                }
            });
        } catch (error) {
            console.error("Error moving test to draftedTests:", error);
        }
    }
}

module.exports = {
    Test
};
