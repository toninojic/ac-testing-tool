const express = require('express');
const router = express.Router();
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const device = require('express-device');
const dotenv = require('dotenv');
const fs = require('fs');
const { MongoClient, ServerApiVersion } = require('mongodb');
const { createClient } = require('redis');

dotenv.config();

const config = {
    testCheckerInterval: "*/10 * * * * *",
    maximumReqBodySize: '5mb',
    testsMainDataPath: path.join(__dirname, './acTestData'),
    archivedTestsDataPath: path.join(__dirname, './archivedTests'),
    errorLogPath: path.join(__dirname, './error.log'),
    maximumErrorsPerInterval: 5,
    errorTrackingIntervalDurationInMs: 10 * 60 * 1000,
    slackChannelName: "C08B1E5CT2P",
};

const corsOptions = {
    origin: process.env.CORS_ORIGIN.split(','),
    optionsSuccessStatus: 200
};

const app = express();

app.use(bodyParser.json({ limit: config.maximumReqBodySize }));
app.use(device.capture());
app.use(cors(corsOptions));

const uri = `mongodb+srv://antonijenojic01:${process.env.DB_PASSWORD}@testingtool.6oc6s.mongodb.net/?retryWrites=true&w=majority&appName=TestingTool`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

const connectToDatabase = async () => {
    try {
        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } catch (error) {
        console.error("MongoDB connection error:", error);
        process.exit(1);
    }
};

connectToDatabase();

// Redis connection setup
const redisClient = createClient({
    url: process.env.REDIS_URI,
});

redisClient.on('error', (err) => console.error('Redis connection error:', err));

const connectToRedis = async () => {
    try {
        await redisClient.connect();
        console.log('Connected to Redis successfully!');
    } catch (error) {
        console.error('Redis connection error:', error);
        process.exit(1);
    }
};

connectToRedis();

const serverConfig = {
    app,
    fs,
    router,
    path,
    port: process.env.PORT,
    slackSigningSecret: process.env.SLACK_SIGNING_SECRET,
    slackBotToken: process.env.SLACK_BOT_TOKEN,
    enviromentVar: process.env.ENVIRONMENT,
    mongoClient: client, // Export MongoDB client
    redisClient, // Export Redis client
};

module.exports = {
    ...serverConfig,
    config
};
