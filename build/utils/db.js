"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dbUrl = process.env.DB_URL || '';
const connectDB = async (retries = 5) => {
    try {
        const connection = await mongoose_1.default.connect(dbUrl);
        console.log(`Database connected with host: ${connection.connection.host}`);
    }
    catch (error) {
        console.error(`Database connection failed: ${error.message}`);
        // Retry logic with a limit
        if (retries > 0) {
            console.log(`Retrying connection in 5 seconds... (${retries} retries left)`);
            setTimeout(() => connectDB(retries - 1), 5000);
        }
        else {
            console.error('Max retries reached. Exiting...');
            process.exit(1); // Exit the process if connection fails after retries
        }
    }
};
// Handle graceful shutdown
process.on('SIGINT', async () => {
    await mongoose_1.default.connection.close();
    console.log('Database connection closed due to app termination');
    process.exit(0);
});
exports.default = connectDB;
