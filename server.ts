import { initSocketServer } from './socketServer';
import dotenv from 'dotenv';
import { app } from './app'; 
import connectDB from './utils/db'; 
import http from "http";
import { v2 as cloudinary } from 'cloudinary';
import cors from 'cors';

// Load environment variables
dotenv.config();

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_SECRET_KEY,
  region: 'ap-south-1'
});

// Connect to the database
connectDB();

const server = http.createServer(app);

// ✅ Apply CORS before starting the server
app.use(cors({
  origin: "https://lms-client-wheat.vercel.app",
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: "Origin, X-Requested-With, Content-Type, Accept, Authorization"
}));

// Set the port from environment variables or default to 8000
const PORT = process.env.PORT || 8000;

//connect socket server
// initSocketServer(server);

// Start the server
server.listen(PORT, () => {
  console.log(`Server is connected to port ${PORT}`);
});
