import OpenAI from 'openai';
import { config } from '../config';

export class OpenAIService {
  private client: OpenAI;
  private readonly primaryModel = config.openai.modelPrimary;
  private readonly fastModel = config.openai.modelFast;

  constructor() {
    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  /**
   * Generate the next interview question based on conversation history
   */
  async generateInterviewQuestion(
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
    mandatoryData: {
      hasTriggerEvent: boolean;
      hasEmotionalResponse: boolean;
      hasPartnerIntent: boolean;
      hasUnderlyingNeed: boolean;
      hasResolutionHope: boolean;
    }
  ): Promise<string> {
    const systemPrompt = this.buildInterviewSystemPrompt(mandatoryData);

    const response = await this.client.chat.completions.create({
      model: this.fastModel,
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    return response.choices[0].message.content || 'Can you tell me more about that?';
  }

  /**
   * Generate relationship unpacking from both partners' interviews
   */
  async generateUnpacking(
    partnerAResponses: Record<string, any>,
    partnerBResponses: Record<string, any>
  ): Promise<{
    summary: string;
    sharedTruths: string[];
    positiveIntents: { partnerA: string; partnerB: string };
    patterns: string[];
    recommendations: string[];
  }> {
    const systemPrompt = `You are a neutral, emotionally safe mediator for romantic partners.
Tone: slow, warm, grounded, gentle, deeply validating. Use soft, simple sentences and short lines.
Always create safety, validate both partners, slow the moment down, and make the situation feel workable.
Focus on needs, vulnerability, and misunderstandings; guide them toward feeling on the same team.
Never blame, escalate, pressure, diagnose, moralize, or suggest breaking up.
Goal: emotional safety → clarity → understanding → reconnection.

Return ONLY JSON with keys: summary, sharedTruths, positiveIntents, patterns, recommendations.
- summary: a short neutral recount of the conflict (1–2 sentences, gentle tone)
- sharedTruths: array of validating statements both might agree with
- positiveIntents: { partnerA: string, partnerB: string } reframing each partner generously
- patterns: array of gentle observations about dynamics
- recommendations: array of short, calming next steps (no blame, no ultimatums).`;

    const userPrompt = `Partner A's perspective:
${JSON.stringify(partnerAResponses, null, 2)}

Partner B's perspective:
${JSON.stringify(partnerBResponses, null, 2)}

Please analyze this conflict and provide your response in this exact JSON format:
{
  "summary": "A single string summarizing the conflict from both perspectives",
  "sharedTruths": ["array", "of", "strings"],
  "positiveIntents": {
    "partnerA": "positive reframing of Partner A's behavior as a string",
    "partnerB": "positive reframing of Partner B's behavior as a string"
  },
  "patterns": ["array", "of", "pattern", "strings"],
  "recommendations": ["array", "of", "recommendation", "strings"]
}`;

    const response = await this.client.chat.completions.create({
      model: this.primaryModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    return content ? JSON.parse(content) : this.getDefaultUnpacking();
  }

  /**
   * Detect crisis language that requires immediate intervention
   */
  async detectCrisisLanguage(text: string): Promise<{
    isCrisis: boolean;
    severity: 'low' | 'medium' | 'high';
    concerns: string[];
    recommendation: string;
  }> {
    const systemPrompt = `You are a crisis detection system for relationship counseling.
Detect concerning language including:
- Threats of self-harm or harm to others
- Extreme emotional distress
- Mentions of violence or abuse
- Suicidal ideation
- Signs of immediate danger

Respond with JSON containing: isCrisis (boolean), severity (low/medium/high), concerns (array), recommendation (string)`;

    const response = await this.client.chat.completions.create({
      model: this.fastModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze this text for crisis indicators: "${text}"` },
      ],
      temperature: 0.3, // Lower temperature for more consistent crisis detection
      max_tokens: 300,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    return content ? JSON.parse(content) : { isCrisis: false, severity: 'low', concerns: [], recommendation: '' };
  }

  /**
   * Transcribe audio using Whisper API
   */
  async transcribeAudio(audioBuffer: Buffer, filename: string): Promise<string> {
    // OpenAI SDK accepts Buffer directly in Node.js
    // Cast to 'any' to satisfy TypeScript, as the SDK internally handles Buffer -> File conversion
    const transcription = await this.client.audio.transcriptions.create({
      file: audioBuffer as any,
      model: 'whisper-1',
      language: 'en',
    });

    return transcription.text;
  }

  // Private helper methods

  private buildInterviewSystemPrompt(mandatoryData: {
    hasTriggerEvent: boolean;
    hasEmotionalResponse: boolean;
    hasPartnerIntent: boolean;
    hasUnderlyingNeed: boolean;
    hasResolutionHope: boolean;
  }): string {
    const missingData = [];
    if (!mandatoryData.hasTriggerEvent) missingData.push('the trigger event (what happened)');
    if (!mandatoryData.hasEmotionalResponse) missingData.push('their emotional response (how they feel)');
    if (!mandatoryData.hasPartnerIntent) missingData.push('their interpretation of partner\'s intent');
    if (!mandatoryData.hasUnderlyingNeed) missingData.push('their underlying need');
    if (!mandatoryData.hasResolutionHope) missingData.push('what resolution looks like to them');

    let prompt = `You are an empathetic relationship counselor conducting a private interview.
Your goal is to help the person express their perspective on a recent conflict.

Guidelines:
- Be warm, empathetic, and non-judgmental
- Ask open-ended questions
- Validate their feelings
- Gently probe for deeper understanding
- Keep questions concise (1-2 sentences max)`;

    if (missingData.length > 0) {
      prompt += `\n\nStill need to collect: ${missingData.join(', ')}`;
      prompt += `\nAsk your next question to gather one of these missing pieces.`;
    } else {
      prompt += `\n\nAll mandatory data has been collected. Ask if there's anything else they'd like to add, then suggest completing the interview.`;
    }

    return prompt;
  }

  private getDefaultUnpacking() {
    return {
      summary: 'Unable to generate analysis at this time.',
      sharedTruths: [],
      positiveIntents: { partnerA: '', partnerB: '' },
      patterns: [],
      recommendations: [],
    };
  }
}

export const openAIService = new OpenAIService();
