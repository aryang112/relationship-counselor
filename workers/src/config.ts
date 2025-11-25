import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from backend .env file
dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

export const config = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null, // Required for BullMQ
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  queues: {
    interview: 'ai-interview-queue',
    unpacking: 'unpacking-queue',
    crisis: 'crisis-detection-queue',
  },
};

// Validate required environment variables
if (!config.openai.apiKey) {
  throw new Error('OPENAI_API_KEY is required in environment variables');
}
