const { createClient } = require('redis');

(async () => {
    const redisClient = createClient({
        url: 'redis://127.0.0.1:6379',
    });

    redisClient.on('error', (err) => console.error('Redis connection error:', err));

    try {
        await redisClient.connect();
        console.log('Connected to Redis!');
        const pong = await redisClient.ping();
        console.log('PING response:', pong);
        await redisClient.disconnect();
    } catch (error) {
        console.error('Redis connection failed:', error);
    }
})();
