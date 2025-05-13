"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const app_1 = require("./app");
const db_1 = __importDefault(require("./utils/db"));
const http_1 = __importDefault(require("http"));
const cloudinary_1 = require("cloudinary");
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
// ✅ Apply CORS before creating the server
// app.use(cors({
//   origin: "https://lms-client-wheat.vercel.app",
//   credentials: true,
//   methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
//   allowedHeaders: "Origin, X-Requested-With, Content-Type, Accept, Authorization"
// }));
// Create HTTP server **after** middleware setup
const server = http_1.default.createServer(app_1.app);
// Set the port from environment variables or default to 8000
const PORT = process.env.PORT || 8000;
// ✅ If using WebSockets, configure it properly
// initSocketServer(server);
// Start the server
server.listen(PORT, () => {
    console.log(`Server is connected to port ${PORT}`);
});
