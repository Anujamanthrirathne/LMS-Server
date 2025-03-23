import { Redis } from 'ioredis';
require('dotenv').config();

const redisClient = () => {
    if (process.env.REDIS_URL) {
        // Log successful connection to Redis
        console.log(`Redis connected`);
        
        // Return the initialized Redis client with the URL
        return new Redis(process.env.REDIS_URL);
    }
    throw new Error('Redis Connection failed');
};

export const redis = redisClient();
