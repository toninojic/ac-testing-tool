const { redisClient, enviromentVar } = require('../serverConfig');

class RedisService {
    /**
     * Retrieves all tests from Redis that match the key pattern: <clientName>:activeTests:*
     *
     * @param {string} clientName - The name of the client used to construct the key pattern.
     * @returns {Promise<Array>} - Returns a promise that resolves to an array of parsed JSON objects representing tests.
     *
     * Note: This function iterates over each key matching the pattern, retrieves its value,
     *       performs basic validations (such as checking for empty or invalid strings), and parses the JSON.
     */
    static async getAllTests(clientName) {
        try {
            // Fetch all keys for the given clientName with status "activeTests"
            const keys = await redisClient.keys(`${clientName}:activeTests:*`);
            if (!keys.length) return [];
            
            const pipeline = redisClient.multi();
            keys.forEach(key => pipeline.get(key));
            const testValues = await pipeline.exec();
    
            const results = [];
            for (let i = 0; i < testValues.length; i++) {
                const [err, test] = testValues[i];
                
                // Validate that the retrieved value exists and is a string
                if (!testValues[i] || typeof testValues[i] !== 'string') {
                    console.error(`Skipping key ${keys[i]}: value is not a string.`);
                    continue;
                }
                
                const trimmed = testValues[i].trim();
                // Skip values that are empty or consist of only one quote character
                if (trimmed === '' || trimmed === '"' || trimmed === "''") {
                    console.error(`Skipping key ${keys[i]}: value is empty or invalid:`, test);
                    continue;
                }
                
                // Basic check: if the value doesn't start with '{' or '[' then it's likely not valid JSON
                if (trimmed[0] !== '{' && trimmed[0] !== '[') {
                    console.error(`Invalid JSON format for key ${keys[i]}, skipping. Value:`, test);
                    continue;
                }
                
                try {
                    results.push(JSON.parse(testValues[i]));
                } catch (parseError) {
                    console.error(`Error parsing JSON for key ${keys[i]}:`, parseError, "Value:", test);
                    //TODO add delete if test is corupted in redis
                }
            }
            return results;
        } catch (error) {
            console.error("Redis getAllTests error:", error);
            return [];
        }
    }
      
    /**
     * Saves the entire activeTests object in Redis under the key: <clientName>:activeTests
     *
     * @param {string} clientName - The name of the client.
     * @param {Object} activeTests - The object containing all active tests to be saved.
     * @returns {Promise<void>} - Returns a promise that resolves when the data is saved.
     *
     * The function stringifies the activeTests object and saves it to Redis.
     */
    static async setActiveTests(clientName, activeTests) {
        try {
            const key = `${clientName}:activeTests`;
            // Convert activeTests to a plain JSON string
            const jsonData = JSON.stringify(activeTests);
            await redisClient.set(key, jsonData);
            if (enviromentVar === 'develop') {
                console.log(`Active tests saved in Redis under key ${key}.`);
            }
        } catch (error) {
            console.error("Redis setActiveTests error:", error);
        }
    }
    
    /**
     * Retrieves the entire activeTests object for a given client from Redis.
     *
     * @param {string} clientName - The name of the client.
     * @returns {Promise<Object|null>} - Returns a promise that resolves to the parsed activeTests object,
     *                                   or null if the key does not exist.
     *
     * This function fetches the value stored under <clientName>:activeTests, parses it from JSON,
     * and returns the resulting object.
     */
    static async getActiveTests(clientName) {
        try {
            const key = `${clientName}:activeTests`;
            const data = await redisClient.get(key);
            if (!data) return null;
            return JSON.parse(data);
        } catch (error) {
            console.error("Redis getActiveTests error:", error);
            return null;
        }
    }

    /**
     * Deletes a specific test from the activeTests object in Redis.
     *
     * @param {string} clientName - The name of the client.
     * @param {string} testId - The ID of the test to be removed from activeTests.
     * @returns {Promise<void>} - Returns a promise that resolves when the test is removed.
     *
     * The function retrieves the current activeTests object, removes the test with the specified testId,
     * and then saves the updated activeTests object back to Redis.
     */
    static async deleteActiveTest(clientName, testId) {
        try {
            // Retrieve the existing activeTests object from Redis
            let activeTests = await RedisService.getActiveTests(clientName);
            if (activeTests && activeTests[testId]) {
                // Remove the specified test from the activeTests object
                delete activeTests[testId];
                // Save the updated activeTests object back to Redis
                await RedisService.setActiveTests(clientName, activeTests);
                if (enviromentVar === 'develop') {
                    console.log(`Test ${testId} removed from Redis activeTests.`);
                }
            } else {
                if (enviromentVar === 'develop') {
                    console.log(`Test ${testId} not found in Redis activeTests.`);
                }
            }
        } catch (error) {
            console.error("Error deleting active test from Redis:", error);
        }
    }
}

module.exports = {
    RedisService
};
