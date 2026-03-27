import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from backend .env file
dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

export const config = {
  redis: process.env.REDIS_URL
    ? {
        url: process.env.REDIS_URL,
        maxRetriesPerRequest: null, // Required for BullMQ
      }
    : {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: null, // Required for BullMQ
      },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    modelPrimary: process.env.OPENAI_MODEL || 'gpt-4o',
    modelFast: process.env.OPENAI_MODEL_FAST || 'gpt-4o-mini',
  },
  queues: {
    interview: 'ai-interview-queue',
    unpacking: 'unpacking',
    crisis: 'crisis-detection-queue',
  },
};

// Validate required environment variables
if (!config.openai.apiKey) {
  throw new Error('OPENAI_API_KEY is required in environment variables');
}
