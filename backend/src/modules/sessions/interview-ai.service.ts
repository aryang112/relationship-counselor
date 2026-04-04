/**
 * InterviewAIService — Generates dynamic counselor-style follow-up
 * questions during the private vent phase using OpenAI.
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface PartnerAExtraction {
  topicTag: string;
  issues: string[];
  needs: string[];
  emotions: string[];
}

const BASE_SYSTEM_PROMPT = `You are the user's close friend — the one they call at midnight when something's bothering them. You happen to be incredibly emotionally intelligent. You're having a private, honest conversation about something going on in their relationship.

You are NOT a therapist, counselor, or interviewer. You're a friend who genuinely gives a shit.

VOICE:
- Talk the way a real person texts a close friend: contractions, incomplete sentences sometimes, casual
- Your vibe: warm, direct, a little bit funny when the moment allows it, never performative
- Think of how you'd actually respond if your best friend told you this over drinks
- SHORT responses. 1-2 sentences usually. 3 max. Friends don't monologue.

RESPONSE MIX — rotate between these, never do the same type twice in a row:
1. REFLECT their exact words back (not paraphrased into therapy-speak): "Wait — he actually said that to you?"
2. REACT like a human would: "Oh wow." / "Okay that tracks." / "Yikes." / "Honestly? That's rough."
3. OBSERVE something they might not see: "It kinda sounds like you two were both scared but showing it differently."
4. NORMALIZE: "That's such a common thing btw — a lot of couples hit this exact wall."
5. JUST ASK (no preamble): "What did you say back?"
6. MAKE A STATEMENT (no question): "That must've been a lonely moment." Full stop. Let it sit.
7. ENCOURAGE CONTINUATION (when their message seems unfinished): "Keep going." / "And then?" / "I'm listening."

CRITICAL — DO NOT:
- Start with "It sounds like..." / "I hear you..." / "I can sense..." / "That must be..." / "I understand" — these are therapy clichés. BANNED.
- Ask a question after EVERY message. At least 30% of your responses should NOT contain a question mark. Sometimes the right move is just "damn." and let silence invite them to continue.
- Use the same sentence structure or opener twice in this conversation
- Paraphrase their words into softer/clinical language — use THEIR words, THEIR tone
- Say "That's valid" or "Your feelings are valid" — instead, PROVE you get it by referencing specifics

WHEN THE USER ISN'T DONE TALKING:
- Short messages (under ~15 words), messages ending with "..." or "idk", or messages that feel like the middle of a story → DON'T ask a new question
- Instead: "Go on." / "Take your time." / "And?" / "I'm here." / Just wait.
- Only pivot to a new topic when they've clearly wrapped up a thought (says "that's it", asks you something, or gives a complete story)

WHAT TO NATURALLY UNCOVER (across the whole conversation, not a checklist):
1. What actually happened
2. How it made them feel (in their own words, not yours)
3. What they think was going on for their partner
4. What they actually need underneath the frustration
5. What "better" would look like for them

Before responding, scan your previous messages. If you've used a particular sentence structure or opener, use a completely different one.

HARD RULES:
- Never take sides
- Never give advice or solutions
- Use their partner's actual name when reflecting
- If they've covered something, don't circle back to it
- When all 5 areas feel covered, wrap naturally: "I feel like I really get where you're coming from now. Anything else on your chest, or does that cover it?"`;

type GenderCategory = 'male' | 'female' | 'neutral';

function categorizeGender(gender: string | null | undefined): GenderCategory {
  if (!gender) return 'neutral';
  const g = gender.toLowerCase();
  if (g === 'male') return 'male';
  if (g === 'female') return 'female';
  return 'neutral';
}

const GENDER_TONE_BLOCKS: Record<GenderCategory, string> = {
  male: `
TONE FOR THIS USER:
- Be direct. Skip the soft lead-in and get to the point.
- When they share something vulnerable, honor it without making it precious: "That's real." / "Respect for saying that."
- If they go quiet or terse, don't pry — just be present: "No rush. I'm here."
- Match their energy — if they're concise, you be concise.`,

  female: `
TONE FOR THIS USER:
- When emotions come up, sit with them — don't rush to the next question.
- Validate with specificity, not generic warmth: reference the exact thing they said that landed.
- Give space between emotional moments: "Take a sec with that."
- Your energy: like a best friend who brings tea and just listens first.`,

  neutral: `
TONE FOR THIS USER:
- Warm but not presumptuous. Let them set the pace and the emotional register.
- Mirror their communication style — if they're analytical, meet them there. If they're emotional, hold space.
- "This is your space. However you want to do this."`,
};

// ---------- Behavioral profile field mappings ----------

const CONFLICT_BEHAVIOR_MAP: Record<string, string> = {
  get_louder: 'Tends toward criticism/defensiveness when upset',
  go_silent: 'Tends to stonewall — goes quiet and shuts down',
  say_something_mean: 'Tends toward contempt/criticism under stress',
  cry_or_fall_apart: 'Emotional flooding (expressive) — overwhelm comes out visibly',
  go_numb: 'Emotional flooding (shutdown) — overwhelm causes them to disconnect',
};

const CORE_EMOTION_MAP: Record<string, string> = {
  scared: 'Core emotion under conflict: fear of abandonment',
  hurt: 'Core emotion under conflict: feeling inadequate or unworthy',
  alone: 'Core emotion under conflict: emotional isolation',
  overwhelmed: 'Core emotion under conflict: flooding/dysregulation',
  embarrassed: 'Core emotion under conflict: shame response',
};

const PURSUE_WITHDRAW_MAP: Record<string, string> = {
  push_harder: 'Pursuer — pushes harder to get a response when distressed',
  pull_back: 'Withdrawer — pulls away to avoid escalation',
  depends: 'Situational — may pursue or withdraw depending on context',
};

const FLOODING_THRESHOLD_MAP: Record<string, string> = {
  immediately: 'High flood risk — hits overwhelm fast. Pace the conversation slowly.',
  builds: 'Medium flood risk — overwhelm builds gradually. Standard pace.',
  stay_level: 'Low flood risk — can stay regulated longer. More structure is fine.',
};

const CORE_FEAR_MAP: Record<string, string> = {
  abandonment: 'Core fear: "They\'ll get tired of this eventually" — fear of being left',
  inadequacy: 'Core fear: "I\'m probably overreacting again" — fear of not being enough',
  invisibility: 'Core fear: "They don\'t actually care right now" — fear of being unseen',
  engulfment: 'Core fear: "I just need space but they won\'t let me" — fear of losing autonomy',
  hopelessness: 'Core fear: "We always end up back here" — fear it will never change',
};

const REPAIR_STYLE_MAP: Record<string, string> = {
  real_apology: 'Repair language: words of acknowledgment / genuine apology',
  physical_closeness: 'Repair language: physical touch and proximity',
  time_apart: 'Repair language: de-escalation space then repair',
  show_it: 'Repair language: acts of service / behavior change',
  move_forward: 'Repair language: prefers to move forward without postmortem',
  humor: 'Repair language: levity and humor to reconnect',
};

const RECURRING_THEME_MAP: Record<string, string> = {
  not_priority: 'Perpetual theme: attention/affection deficit — "I don\'t feel prioritized"',
  no_space: 'Perpetual theme: autonomy/control conflict — boundaries around space',
  emotional_labor: 'Perpetual theme: emotional labor imbalance',
  only_explodes: 'Perpetual theme: conflict avoidance until it explodes',
  too_much: 'Perpetual theme: emotional invalidation — "you\'re too much / not enough"',
  uncertain: 'Perpetual theme: commitment uncertainty',
  different_every_time: 'No persistent perpetual theme',
};

const COMMUNICATION_MEDIUM_MAP: Record<string, string> = {
  text: 'Fights mostly via text — HIGH misread-tone risk',
  call: 'Fights mostly via calls — tone present but facial expressions absent',
  in_person: 'Fights mostly in person — full signal, standard handling',
  sit_on_it: 'Tends to sit on it — conflict avoidance / delayed explosion risk',
};

/**
 * Maps a field value through a lookup table. Returns the human-readable
 * description or null if the value is missing/unknown.
 */
function mapField(value: string | null | undefined, map: Record<string, string>): string | null {
  if (!value) return null;
  return map[value] || null;
}

/**
 * Appends new-style behavioral profile lines for a single person.
 * Returns true if at least one line was added.
 */
function appendNewProfileLines(data: Record<string, any>, lines: string[], label: string): boolean {
  let added = false;

  const push = (val: string | null) => {
    if (val) { lines.push(`- ${label}: ${val}`); added = true; }
  };

  push(mapField(data.conflictBehavior, CONFLICT_BEHAVIOR_MAP));
  push(mapField(data.coreEmotion, CORE_EMOTION_MAP));
  push(mapField(data.pursueWithdraw, PURSUE_WITHDRAW_MAP));
  push(mapField(data.floodingThreshold, FLOODING_THRESHOLD_MAP));
  push(mapField(data.coreFear, CORE_FEAR_MAP));
  push(mapField(data.repairStyle, REPAIR_STYLE_MAP));
  push(mapField(data.recurringTheme, RECURRING_THEME_MAP));
  push(mapField(data.communicationMedium, COMMUNICATION_MEDIUM_MAP));

  return added;
}

/**
 * Appends old-style profile lines (pre-redesign onboarding) as a fallback.
 * Returns true if at least one line was added.
 */
function appendLegacyProfileLines(data: Record<string, any>, lines: string[], label: string): boolean {
  let added = false;
  if (data.communicationStyles?.length) {
    lines.push(`- ${label}: Conflict style: ${data.communicationStyles.join(', ')}`);
    added = true;
  }
  if (data.conflictFeelings?.length) {
    lines.push(`- ${label}: Conflict triggers feelings of being ${data.conflictFeelings.join(', ')}`);
    added = true;
  }
  if (data.attachmentStyle) {
    lines.push(`- ${label}: Attachment tendency: ${data.attachmentStyle}`);
    added = true;
  }
  if (data.pastConflictPatterns?.length) {
    lines.push(`- ${label}: Recurring patterns: ${data.pastConflictPatterns.join(', ')}`);
    added = true;
  }
  return added;
}

/**
 * Detects whether a user data object uses the new behavioral profile fields.
 */
function hasNewProfileFields(data: Record<string, any> | null | undefined): boolean {
  if (!data) return false;
  return !!(data.conflictBehavior || data.coreEmotion || data.pursueWithdraw ||
    data.floodingThreshold || data.coreFear || data.repairStyle ||
    data.recurringTheme || data.communicationMedium);
}

/**
 * Builds a couple profile block from onboarding data.
 * The AI uses this silently to ask better questions — never surfaces it directly.
 *
 * Supports both the new behavioral profile fields (post-redesign) and the
 * legacy fields (communicationStyles, conflictFeelings, etc.) for backward
 * compatibility with couples who onboarded before the redesign.
 */
function buildCoupleProfileBlock(onboardingData: Record<string, any> | null, isUserA: boolean): string {
  if (!onboardingData) return '';

  // Get the current user's data and their partner's data
  const userData = isUserA ? onboardingData.userA : onboardingData.userB;
  const partnerData = isUserA ? onboardingData.userB : onboardingData.userA;

  if (!userData && !partnerData) return '';

  const lines: string[] = [
    '\nCOUPLE CONTEXT (use silently to understand them better — NEVER say "you mentioned in onboarding" or reference this data directly):',
  ];

  // --- This person's profile ---
  if (userData) {
    if (hasNewProfileFields(userData)) {
      appendNewProfileLines(userData, lines, 'This person');
    } else {
      appendLegacyProfileLines(userData, lines, 'This person');
    }
  }

  // --- Partner's profile ---
  if (partnerData) {
    if (hasNewProfileFields(partnerData)) {
      appendNewProfileLines(partnerData, lines, 'Their partner');
    } else {
      appendLegacyProfileLines(partnerData, lines, 'Their partner');
    }
  }

  if (lines.length <= 1) return '';

  lines.push('');
  lines.push('USE THIS TO:');
  lines.push('- Use flooding threshold to pace the interview — slower for high-flood-risk, more structured for low');
  lines.push('- Use conflict behavior to understand what they SHOW vs what they FEEL (core emotion)');
  lines.push('- Use pursue/withdraw role to explain each partner\'s behavior to the other without taking sides');
  lines.push('- Use core fear to frame questions protectively — don\'t accidentally poke the wound');
  lines.push('- Use repair style to understand what "making it better" means to each person');
  lines.push('- Use recurring theme to notice if this conflict is a variation of a perpetual pattern');
  lines.push('- Use communication medium to note tone-reading risks (especially text-based fights)');

  return lines.join('\n');
}

function buildSystemPrompt(gender: string | null | undefined, pastContext?: string | null, coupleProfile?: string | null): string {
  const category = categorizeGender(gender);
  let prompt = BASE_SYSTEM_PROMPT + '\n' + GENDER_TONE_BLOCKS[category];
  if (coupleProfile) {
    prompt += '\n' + coupleProfile;
  }
  if (pastContext) {
    prompt += `\n\nThis couple has used relate before. Here's context:\n${pastContext}\nUse this to ask more targeted questions.`;
  }
  return prompt;
}

export { buildCoupleProfileBlock };

@Injectable()
export class InterviewAIService {
  private client: OpenAI;
  private model: string;

  constructor(private configService: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.configService.get('OPENAI_API_KEY'),
    });
    this.model = this.configService.get('OPENAI_MODEL_FAST') || 'gpt-4o-mini';
  }

  async generateNextQuestion(
    conversationHistory: ConversationMessage[],
    gender?: string | null,
    pastContext?: string | null,
    coupleProfile?: string | null,
  ): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: buildSystemPrompt(gender, pastContext, coupleProfile) },
        ...conversationHistory,
      ],
      temperature: 0.7,
      max_tokens: 120,
    });

    return (
      response.choices[0].message.content ||
      'Can you tell me a bit more about how that felt for you?'
    );
  }

  async extractPartnerAContext(
    responses: Array<{ question: string; answer: string }>,
  ): Promise<PartnerAExtraction> {
    const transcript = responses
      .map((r) => `Q: ${r.question}\nA: ${r.answer}`)
      .join('\n\n');

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: `You are analyzing a relationship counseling interview transcript. Extract a structured summary.

Return a JSON object with:
- "topicTag": A neutral 2-5 word label for the topic (e.g., "household responsibilities", "quality time together", "communication patterns"). Must NOT reveal private details or take sides.
- "issues": Array of 2-4 core issues mentioned (brief phrases, neutral language)
- "needs": Array of 2-3 underlying needs expressed (brief phrases)
- "emotions": Array of 2-4 emotions expressed (single words)

Keep everything neutral and non-judgmental. The topicTag will be shown to the partner, so it must not reveal specifics of what was said.`,
        },
        {
          role: 'user',
          content: transcript,
        },
      ],
      temperature: 0.3,
      max_tokens: 300,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content || '{}';
    const parsed = JSON.parse(content);

    return {
      topicTag: parsed.topicTag || 'Something on their mind',
      issues: parsed.issues || [],
      needs: parsed.needs || [],
      emotions: parsed.emotions || [],
    };
  }

  async generateNextQuestionWithContext(
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
    partnerAContext: { issues: string[]; needs: string[]; emotions: string[] },
    gender?: string | null,
    pastContext?: string | null,
    coupleProfile?: string | null,
  ): Promise<string> {
    const contextBlock = `
CONTEXT FROM PARTNER'S SESSION (DO NOT reveal these details directly — use them to gently steer the conversation):
- Key topic areas: ${partnerAContext.issues.join(', ')}
- Underlying needs mentioned: ${partnerAContext.needs.join(', ')}
- Emotions expressed: ${partnerAContext.emotions.join(', ')}

Your goal: Help this partner explore these same topic areas naturally, without revealing what the other partner said. Ask open-ended questions that lead toward these themes.`;

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: buildSystemPrompt(gender, pastContext, coupleProfile) + '\n\n' + contextBlock },
        ...conversationHistory,
      ],
      temperature: 0.7,
      max_tokens: 120,
    });

    return (
      response.choices[0].message.content ||
      'Can you tell me a bit more about how that felt for you?'
    );
  }
}
