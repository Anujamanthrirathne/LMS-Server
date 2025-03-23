"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socketServer_1 = require("./socketServer");
const dotenv_1 = __importDefault(require("dotenv"));
const app_1 = require("./app");
const db_1 = __importDefault(require("./utils/db"));
const http_1 = __importDefault(require("http"));
const cloudinary_1 = require("cloudinary");
const server = http_1.default.createServer(app_1.app);
const cors_1 = __importDefault(require("cors"));
// Load environment variables
dotenv_1.default.config();
// Cloudinary configuration
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_SECRET_KEY,
    region: 'ap-south-1'
});
// Connect to the database
(0, db_1.default)();
app_1.app.use((0, cors_1.default)({
    origin: ['https://lms-client-wheat.vercel.app', 'https://*.vercel.app'],
    credentials: true,
    methods: "GET,POST,PUT,DELETE",
    allowedHeaders: "Origin, X-Requested-With, Content-Type, Accept, Authorization",
}));
// Set the port from environment variables or default to 8000
const PORT = process.env.PORT || 8000;
//connect socket server
(0, socketServer_1.initSocketServer)(server);
// Start the server
server.listen(PORT, () => {
    console.log(`Server is connected to port ${PORT}`);
});
