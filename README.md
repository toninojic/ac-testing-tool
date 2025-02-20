# tt-node-service

This is an A/B testing Node.js service. The project utilizes the Express framework for routing and server configuration, integrates with Slack for notifications when tests are created or archived, uses Dotenv for managing environment variables, and includes a built-in cron job to check for expired tests. Additionally, the service now dynamically extracts the client name from the test URL and caches active tests in Redis.

## Getting Started

Follow these instructions to set up and run the project on your local machine for development and testing purposes.

### Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (version 22.0 or later)
- [npm](https://www.npmjs.com/) (version 9.x or later)

### Installation

1. **Clone the Repository**  
   Clone the project repository to your local machine and navigate to the project directory.

2. **Install Dependencies**  
   Run the following command to install all required dependencies:
   ```shell
   npm install
    This command installs all packages listed in the package-lock.json file into the local node_modules folder. The .env.example file serves as a template for creating your own .env file.

### Configuration
    Create a .env file in the root of the project (based on the provided .env.example) and configure the following environment variables:

     * MongoDB connection string
     * Redis configuration
     * Slack webhook URL or token
     * Other service-specific settings
     * Development
     * To start the development server,npm run nodemon:

### Routes
    The following endpoints are available:

     * /health
        Description: Checks if the application is running.
        Access: Only accessible through the AC VPN or designated IP.

    * /update-test
        Description: Updates a test in MongoDB and, if applicable, updates the corresponding test in the Redis active tests cache.

    * /delete-test
        Description: Deletes a test by moving it from activeTests to draftedTests in MongoDB, removing it from Redis, and sending a Slack notification.

    * /get-test
        Description: Returns active test data for a given website.
        Usage Example:
        bash
        Copy
        http://localhost:8080/get-test?url=http://apuestasdeportivases.local/
        This endpoint now dynamically extracts the client name from the URL (i.e. the portion between https:// and the first dot) to retrieve the appropriate tests.
    
    * /get-all-test
        Description: Returns a list of active tests across different websites.

### New Features & Changes
    Dynamic Client Name Extraction:
    The service now automatically extracts the client name from the provided URL. For example, given the URL https://testingapp.local/, it extracts testingapp as the client name.

    Redis Caching:
    Active tests are cached in Redis under a key specific to the client (e.g., testingapp:activeTests). This reduces the number of MongoDB queries and improves performance.

    Expired Test Archiving:
    A built-in cron job periodically checks for expired tests. Expired tests are moved from activeTests to draftedTests in MongoDB, removed from Redis, and a Slack notification is sent.

    Syncing Active Tests:
    Second cron job every 3 hours checks for active tests in Mongo and update Redis.

    Improved Error Handling and Logging:
    Enhanced logging and error handling mechanisms help in quickly diagnosing and resolving issues.