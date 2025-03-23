import mongoose from 'mongoose';

const dbUrl: string = process.env.DB_URL || '';

const connectDB = async (retries = 5) => {
  try {
    const connection = await mongoose.connect(dbUrl);
    console.log(`Database connected with host: ${connection.connection.host}`);
  } catch (error: any) {
    console.error(`Database connection failed: ${error.message}`);

    // Retry logic with a limit
    if (retries > 0) {
      console.log(`Retrying connection in 5 seconds... (${retries} retries left)`);
      setTimeout(() => connectDB(retries - 1), 5000);
    } else {
      console.error('Max retries reached. Exiting...');
      process.exit(1); // Exit the process if connection fails after retries
    }
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('Database connection closed due to app termination');
  process.exit(0);
});

export default connectDB;
