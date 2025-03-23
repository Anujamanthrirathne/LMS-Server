import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { ErrorMiddleware } from './middleware/error'; // Custom error middleware
import userRouter from './routes/user.route';
import courseRouter from './routes/course.route';
import connectDB from './utils/db'; // Database connection utility
import { v2 as cloudinary } from 'cloudinary';
import orderRouter from './routes/order.route';
import notificationRouter from './routes/notification.route';
import analyticsRouter from './routes/analytics.route';
import layoutRouter from './routes/layout.route';
import resourceRouter from './routes/resource.route';
import { rateLimit } from 'express-rate-limit';

dotenv.config(); // Load environment variables

export const app = express();

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_SECRET_KEY,
});

// Middleware to parse JSON payloads with larger size and handle request timeout
app.use((req, res, next) => {
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
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '100mb' })); // Adjusted payload size limit
app.use(cookieParser()); // Parse cookies

// CORS Middleware
app.use(
  cors({
    origin: "https://lms-client-wheat.vercel.app", // Allow your frontend domain
    credentials: true, // Allow credentials (cookies, authorization headers)
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  })
);

// API request limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

// Routes
app.use('/api/v1', userRouter); // User-related routes
app.use('/api/v1', courseRouter); // Course-related routes
app.use('/api/v1', orderRouter);
app.use('/api/v1', notificationRouter);
app.use('/api/v1', analyticsRouter);
app.use('/api/v1', layoutRouter);
app.use('/api/v1', resourceRouter);

// Test Route
app.get('/test', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'API is Working',
  });
});

// Unknown Route Handler
app.all('*', (req: Request, res: Response, next: NextFunction) => {
  const error = new Error(`Route ${req.originalUrl} not found`) as any;
  error.statusCode = 404;
  next(error);
});

// Error Middleware
app.use(ErrorMiddleware);

// Final middleware for connection management
app.use((req, res, next) => {
  res.setHeader("Connection", "keep-alive");
  next();
});
