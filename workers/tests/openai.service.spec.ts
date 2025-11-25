import { OpenAIService } from '../src/services/openai.service';

describe('OpenAIService', () => {
  let service: OpenAIService;

  beforeAll(() => {
    // Mock the OpenAI API key for testing
    if (!process.env.OPENAI_API_KEY) {
      process.env.OPENAI_API_KEY = 'sk-test-key';
    }
  });

  beforeEach(() => {
    service = new OpenAIService();
  });

  it('should instantiate successfully', () => {
    expect(service).toBeDefined();
  });

  it('should have generateInterviewQuestion method', () => {
    expect(typeof service.generateInterviewQuestion).toBe('function');
  });

  it('should have generateUnpacking method', () => {
    expect(typeof service.generateUnpacking).toBe('function');
  });

  it('should have detectCrisisLanguage method', () => {
    expect(typeof service.detectCrisisLanguage).toBe('function');
  });

  it('should have transcribeAudio method', () => {
    expect(typeof service.transcribeAudio).toBe('function');
  });
});
