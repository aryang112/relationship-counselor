import { Worker, Job } from 'bullmq';
import { config } from '../config';
import { openAIService } from '../services/openai.service';
import { InterviewJobData, InterviewJobResult } from '../queues/interview.queue';

export class InterviewProcessor {
  private worker: Worker<InterviewJobData, InterviewJobResult>;

  constructor() {
    this.worker = new Worker<InterviewJobData, InterviewJobResult>(
      config.queues.interview,
      async (job) => this.processJob(job),
      {
        connection: config.redis,
        concurrency: 5, // Process up to 5 interviews concurrently
      }
    );

    this.setupEventHandlers();
  }

  private async processJob(job: Job<InterviewJobData>): Promise<InterviewJobResult> {
    const { userResponse, conversationHistory, mandatoryData } = job.data;

    console.log(`Processing interview job ${job.id} for interview ${job.data.interviewId}`);

    // Add user's response to conversation history
    const updatedHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...conversationHistory,
      { role: 'user' as const, content: userResponse },
    ];

    // Generate next question using OpenAI
    const nextQuestion = await openAIService.generateInterviewQuestion(
      updatedHistory,
      mandatoryData
    );

    // Check if interview is complete (all mandatory data collected)
    const isComplete = Object.values(mandatoryData).every((value) => value === true);

    console.log(`Interview ${job.data.interviewId}: isComplete=${isComplete}`);

    return {
      nextQuestion,
      isComplete,
    };
  }

  private setupEventHandlers() {
    this.worker.on('completed', (job, result) => {
      console.log(`✅ Interview job ${job.id} completed:`, {
        interviewId: job.data.interviewId,
        isComplete: result.isComplete,
      });
    });

    this.worker.on('failed', (job, error) => {
      console.error(`❌ Interview job ${job?.id} failed:`, {
        interviewId: job?.data?.interviewId,
        error: error.message,
      });
    });

    this.worker.on('error', (error) => {
      console.error('Interview worker error:', error);
    });
  }

  async close() {
    await this.worker.close();
  }
}
