import { InterviewProcessor } from './processors/interview.processor';
import { UnpackingProcessor } from './processors/unpacking.processor';
import { CrisisProcessor } from './processors/crisis.processor';
import { config } from './config';

console.log('🚀 Starting AI Workers for Relationship Mediation...\n');

// Validate configuration
console.log('Configuration:');
console.log(`  Redis: ${config.redis.host}:${config.redis.port}`);
console.log(`  OpenAI API Key: ${config.openai.apiKey ? '✓ Set' : '✗ Missing'}`);
console.log(`  Queues:`, config.queues);
console.log('');

// Initialize all processors
const interviewProcessor = new InterviewProcessor();
const unpackingProcessor = new UnpackingProcessor();
const crisisProcessor = new CrisisProcessor();

console.log('✅ Workers initialized and listening for jobs:\n');
console.log(`  📝 Interview Handler - Queue: ${config.queues.interview}`);
console.log(`  🧠 Unpacking Generator - Queue: ${config.queues.unpacking}`);
console.log(`  ⚠️  Crisis Detector - Queue: ${config.queues.crisis}`);
console.log('');

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`\n${signal} received. Gracefully shutting down workers...`);

  await Promise.all([
    interviewProcessor.close(),
    unpackingProcessor.close(),
    crisisProcessor.close(),
  ]);

  console.log('✅ All workers closed successfully');
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Keep process alive
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  shutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log('Workers are running. Press Ctrl+C to stop.\n');
