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
    partnerBResponses: Record<string, any>,
    pastContext?: string,
  ): Promise<{
    summary: string;
    sharedTruths: string[];
    positiveIntents: { partnerA: string; partnerB: string };
    underlyingNeeds: { partnerA: string; partnerB: string };
    breakthrough: string;
    patterns: string[];
    recommendations: string[];
  }> {
    let systemPrompt = `You are writing insight cards for a couple who just shared their perspectives on a conflict. Think Spotify Wrapped energy meets relationship wisdom — personal, direct, surprising, warm.

VOICE: Direct second-person address ("You both..." / "When [Name] said X, what they were really saying was..."). Warm but not clinical. Like a wise friend who sees the bigger picture.

TONE RULES:
- Write like you're talking TO them, not ABOUT them
- Short, punchy sentences. No therapy jargon.
- Each insight should feel like a gentle truth-bomb — specific enough that they think "wow, that's exactly right"
- Frame conflicts as shared problems, never one person's fault
- Find the surprising reframe: the thing neither of them saw

OUTPUT (JSON):
- "summary": 1-2 sentences describing what happened, written directly to them using "you both" (NOT third person like "Partner A and Partner B are experiencing..."). Be specific — reference the actual topic.
- "sharedTruths": Array of 3-4 statements both partners would nod at. Use "you both" voice: "You both want to feel prioritized" not "Both partners desire prioritization."
- "positiveIntents": { partnerA: string, partnerB: string } — Reframe each person's behavior generously and specifically. Not "was trying to communicate" but explain the love/fear underneath their behavior in 2-3 sentences.
- "underlyingNeeds": { partnerA: string, partnerB: string } — What each partner actually needed underneath the surface conflict. Written as "What you really needed was..." 2-3 sentences each.
- "breakthrough": The specific miscommunication or mismatch between their needs. This is the "aha moment." Written directly to them, not generic advice. Reference their specific situation.
- "patterns": Array of 2-3 observations about their dynamic. Be specific to THEIR situation.
- "recommendations": Array of 2-3 concrete, doable micro-actions they can do TOMORROW. Not "improve communication" but specific steps referencing their situation.

CRITICAL:
- Never use passive voice or hedge language ("it seems," "perhaps")
- Every recommendation must be specific enough to actually DO
- If past context is provided, reference it: "This is something that's come up before..."`;

    // Inject past session context if available
    if (pastContext) {
      systemPrompt += `\n\nYou have context from this couple's previous sessions. Reference recurring patterns and past commitments when relevant. Build on previous insights — don't repeat them.\n\n${pastContext}`;
    }

    const userPrompt = `Partner A's perspective:
${JSON.stringify(partnerAResponses, null, 2)}

Partner B's perspective:
${JSON.stringify(partnerBResponses, null, 2)}

Please analyze this conflict and provide your response in this exact JSON format:
{
  "summary": "1-2 sentences written directly to the couple using 'you both'",
  "sharedTruths": ["statement using 'you both' voice", "another shared truth"],
  "positiveIntents": {
    "partnerA": "2-3 sentences reframing their behavior generously",
    "partnerB": "2-3 sentences reframing their behavior generously"
  },
  "underlyingNeeds": {
    "partnerA": "What you really needed was... (2-3 sentences)",
    "partnerB": "What you really needed was... (2-3 sentences)"
  },
  "breakthrough": "The aha moment — the specific miscommunication or mismatch",
  "patterns": ["specific observation about their dynamic"],
  "recommendations": ["concrete micro-action they can do tomorrow"]
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
   * Regenerate relationship unpacking based on user feedback about a previous analysis.
   * Uses the same warm mediator tone and JSON output schema as generateUnpacking(),
   * but includes the previous output and specific feedback to guide improved generation.
   */
  async regenerateUnpacking(
    partnerAResponses: Record<string, any>,
    partnerBResponses: Record<string, any>,
    previousUnpacking: {
      surfaceConflict: string;
      partnerAExperience: string;
      partnerBExperience: string;
      sharedTruths: any;
      deeperInsight: string;
      patternRecognition: string | null;
    },
    feedbackReason: string,
    feedbackText?: string
  ): Promise<{
    summary: string;
    sharedTruths: string[];
    positiveIntents: { partnerA: string; partnerB: string };
    underlyingNeeds: { partnerA: string; partnerB: string };
    breakthrough: string;
    patterns: string[];
    recommendations: string[];
  }> {
    const feedbackReasonMap: Record<string, string> = {
      missed_core_issue: 'felt the analysis missed the core issue of the conflict',
      inaccurate_partner_perspective: 'felt the partner perspectives were inaccurate or didn\'t reflect what was really going on',
      too_generic: 'felt the insights were too generic and wanted more specificity about their unique situation',
      other: 'had concerns about the analysis',
    };

    const humanReadableFeedback = feedbackReasonMap[feedbackReason] || feedbackReasonMap.other;

    const systemPrompt = `You are writing insight cards for a couple who just shared their perspectives on a conflict. Think Spotify Wrapped energy meets relationship wisdom — personal, direct, surprising, warm.

VOICE: Direct second-person address ("You both..." / "When [Name] said X, what they were really saying was..."). Warm but not clinical. Like a wise friend who sees the bigger picture.

TONE RULES:
- Write like you're talking TO them, not ABOUT them
- Short, punchy sentences. No therapy jargon.
- Each insight should feel like a gentle truth-bomb — specific enough that they think "wow, that's exactly right"
- Frame conflicts as shared problems, never one person's fault
- Find the surprising reframe: the thing neither of them saw

You previously generated an analysis for this couple, but one of the partners provided feedback.
They ${humanReadableFeedback}.${feedbackText ? `\n\nTheir additional feedback: "${feedbackText}"` : ''}

Please regenerate your analysis with improved accuracy and specificity based on this feedback.
Pay close attention to what was missed or felt off, and address it directly in the new version.

OUTPUT (JSON):
- "summary": 1-2 sentences describing what happened, written directly to them using "you both". Be specific.
- "sharedTruths": Array of 3-4 statements both partners would nod at. Use "you both" voice.
- "positiveIntents": { partnerA: string, partnerB: string } — Reframe each person's behavior generously in 2-3 sentences.
- "underlyingNeeds": { partnerA: string, partnerB: string } — What each partner actually needed. Written as "What you really needed was..." 2-3 sentences each.
- "breakthrough": The specific miscommunication or mismatch. The "aha moment." Written directly to them.
- "patterns": Array of 2-3 observations about their dynamic. Be specific to THEIR situation.
- "recommendations": Array of 2-3 concrete, doable micro-actions they can do TOMORROW.

CRITICAL:
- Never use passive voice or hedge language ("it seems," "perhaps")
- Every recommendation must be specific enough to actually DO`;

    const userPrompt = `Your previous analysis was:
- Surface conflict: ${previousUnpacking.surfaceConflict}
- Partner A experience: ${previousUnpacking.partnerAExperience}
- Partner B experience: ${previousUnpacking.partnerBExperience}
- Shared truths: ${JSON.stringify(previousUnpacking.sharedTruths)}
- Deeper insight: ${previousUnpacking.deeperInsight}
- Pattern recognition: ${previousUnpacking.patternRecognition || 'None'}

Partner A's perspective:
${JSON.stringify(partnerAResponses, null, 2)}

Partner B's perspective:
${JSON.stringify(partnerBResponses, null, 2)}

Please regenerate your analysis, addressing the feedback. Provide your response in this exact JSON format:
{
  "summary": "1-2 sentences written directly to the couple using 'you both'",
  "sharedTruths": ["statement using 'you both' voice", "another shared truth"],
  "positiveIntents": {
    "partnerA": "2-3 sentences reframing their behavior generously",
    "partnerB": "2-3 sentences reframing their behavior generously"
  },
  "underlyingNeeds": {
    "partnerA": "What you really needed was... (2-3 sentences)",
    "partnerB": "What you really needed was... (2-3 sentences)"
  },
  "breakthrough": "The aha moment — the specific miscommunication or mismatch",
  "patterns": ["specific observation about their dynamic"],
  "recommendations": ["concrete micro-action they can do tomorrow"]
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
      underlyingNeeds: { partnerA: '', partnerB: '' },
      breakthrough: '',
      patterns: [],
      recommendations: [],
    };
  }
}

export const openAIService = new OpenAIService();
