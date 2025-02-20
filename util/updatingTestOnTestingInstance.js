const axios = require('axios');

const updatingTestOnTestingInstance = async (testID, testOrigin) => {
    try {
        const postData = {
        ac_test_unique_id: testID
        };

        await axios.post(`${testOrigin}/wp-json/v1/move-test-to-draft`, postData, {
        headers: {
            'Content-Type': 'application/json'
        }
        });
    } catch (error) {
        console.error('Error occurred:', error.message);
    }
};

module.exports = {
    updatingTestOnTestingInstance
};
