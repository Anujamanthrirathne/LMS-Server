"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
const ioredis_1 = require("ioredis");
require('dotenv').config();
const redisClient = () => {
    if (process.env.REDIS_URL) {
        // Log successful connection to Redis
        console.log(`Redis connected`);
        // Return the initialized Redis client with the URL
        return new ioredis_1.Redis(process.env.REDIS_URL);
    }
    throw new Error('Redis Connection failed');
};
exports.redis = redisClient();
