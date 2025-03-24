"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const error_1 = require("./middleware/error"); // Custom error middleware
const user_route_1 = __importDefault(require("./routes/user.route"));
const course_route_1 = __importDefault(require("./routes/course.route"));
const cloudinary_1 = require("cloudinary");
const order_route_1 = __importDefault(require("./routes/order.route"));
const notification_route_1 = __importDefault(require("./routes/notification.route"));
const analytics_route_1 = __importDefault(require("./routes/analytics.route"));
const layout_route_1 = __importDefault(require("./routes/layout.route"));
const resource_route_1 = __importDefault(require("./routes/resource.route"));
const express_rate_limit_1 = require("express-rate-limit");
dotenv_1.default.config(); // Load environment variables
exports.app = (0, express_1.default)();
// Cloudinary Configuration
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_SECRET_KEY,
});
// Middleware to parse JSON payloads with larger size and handle request timeout
exports.app.use((req, res, next) => {
    // Set timeout to 2 minutes (120,000 ms)
    res.setTimeout(120000, () => {
        res.status(408).json({
            success: false,
            message: 'Request timed out',
        });
    });
    next();
});
// Middlewares
exports.app.use(express_1.default.urlencoded({ extended: true }));
exports.app.use(express_1.default.json({ limit: '100mb' })); // Adjusted payload size limit
exports.app.use((0, cookie_parser_1.default)()); // Parse cookies
exports.app.use((0, cors_1.default)({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: "Origin, X-Requested-With, Content-Type, Accept, Authorization"
}));
// api request limit
const limiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
});
// Routes
exports.app.use('/api/v1', user_route_1.default); // User-related routes
exports.app.use('/api/v1', course_route_1.default); // Course-related routes
exports.app.use('/api/v1', order_route_1.default);
exports.app.use('/api/v1', notification_route_1.default);
exports.app.use('/api/v1', analytics_route_1.default);
exports.app.use('/api/v1', layout_route_1.default);
exports.app.use('/api/v1', resource_route_1.default);
// Test Route
exports.app.get('/test', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'API is Working',
    });
});
// Unknown Route Handler
exports.app.all('*', (req, res, next) => {
    const error = new Error(`Route ${req.originalUrl} not found`);
    error.statusCode = 404;
    next(error);
});
// middleware calls
exports.app.use(limiter);
// Error Middleware
exports.app.use(error_1.ErrorMiddleware);
exports.app.use((req, res, next) => {
    res.setHeader("Connection", "keep-alive");
    next();
});
