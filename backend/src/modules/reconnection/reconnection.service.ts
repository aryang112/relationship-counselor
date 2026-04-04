/**
 * ReconnectionService — Manages the async turn-based reconnection
 * conversation between partners with AI mediation, and handles
 * shared commitment generation and agreement.
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import OpenAI from 'openai';

@Injectable()
export class ReconnectionService {
  private openai: OpenAI;
  private model: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private notificationsService: NotificationsService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get('OPENAI_API_KEY'),
    });
    this.model = this.configService.get('OPENAI_MODEL_FAST') || 'gpt-4o-mini';
  }

  async getMessages(sessionId: string, userId: string) {
    const session = await this.prisma.session.findUniqueOrThrow({
      where: { id: sessionId },
      include: { couple: { include: { userA: true, userB: true } }, commitment: true, unpacking: true },
    });

    let messages = await this.prisma.reconnectionMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });

    const isUserA = userId === session.couple.userAId;

    // Both partners can always send — no strict turn-taking
    const isMyTurn = true;

    // If no messages yet, generate and save an AI opening message
    if (messages.length === 0) {
      const openingMessage = await this.generateOpeningMessage(session);
      const aiMsg = await this.prisma.reconnectionMessage.create({
        data: { sessionId, userId: null, role: 'ai', text: openingMessage },
      });
      messages.push(aiMsg);
    }

    return {
      messages: messages.map((m) => ({
        id: m.id,
        role:
          m.role === 'ai'
            ? 'ai'
            : (m.role === 'user_a' && isUserA) ||
                (m.role === 'user_b' && !isUserA)
              ? 'me'
              : 'partner',
        text: m.text,
        timestamp: m.createdAt.toISOString(),
      })),
      isMyTurn,
      commitment: session.commitment,
      exchangeCount: messages.filter((m) => m.role !== 'ai').length,
    };
  }

  async sendMessage(sessionId: string, userId: string, text: string) {
    const session = await this.prisma.session.findUniqueOrThrow({
      where: { id: sessionId },
      include: {
        couple: { include: { userA: true, userB: true } },
        unpacking: true,
      },
    });

    const isUserA = userId === session.couple.userAId;
    const role = isUserA ? 'user_a' : 'user_b';
    const userName = isUserA
      ? session.couple.userA?.name
      : session.couple.userB?.name;
    const partnerId = isUserA
      ? session.couple.userBId
      : session.couple.userAId;

    // Save user message
    await this.prisma.reconnectionMessage.create({
      data: { sessionId, userId, role, text },
    });

    // Get all messages for AI context
    const allMessages = await this.prisma.reconnectionMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });

    // Fetch past session context for AI memory across sessions
    let pastContext: string | null = null;
    try {
      const pastSessions = await this.prisma.session.findMany({
        where: {
          coupleId: session.coupleId,
          status: 'resolved',
          id: { not: sessionId },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { unpacking: true, commitment: true },
      });

      const sessionsWithUnpacking = pastSessions.filter(
        (s) => s.unpacking && s.unpacking.surfaceConflict !== 'Pending AI unpacking',
      );

      if (sessionsWithUnpacking.length > 0) {
        const lines: string[] = ['PAST SESSION HISTORY (most recent first):'];
        for (const s of sessionsWithUnpacking) {
          const dateStr = s.createdAt.toISOString().split('T')[0];
          const topic = s.topic || s.unpacking!.surfaceConflict || 'unspecified';
          const pattern = s.unpacking!.patternRecognition
            ? s.unpacking!.patternRecognition.substring(0, 100)
            : 'N/A';
          const commitmentText = s.commitment?.text || 'None';
          lines.push('');
          lines.push(`Session (${dateStr}) — Topic: "${topic}"`);
          lines.push(`Insight: ${s.unpacking!.surfaceConflict}`);
          lines.push(`Pattern: ${pattern}`);
          lines.push(`Commitment: ${commitmentText}`);
        }
        const result = lines.join('\n');
        pastContext = result.length > 3600
          ? result.substring(0, 3600) + '\n...(earlier sessions omitted for brevity)'
          : result;
      }
    } catch {
      // Non-blocking — proceed without past context
    }

    // Build couple profile from onboarding data for personality-aware mediation
    const coupleOnboarding = (session.couple.onboardingData as Record<string, any>) || null;

    // Generate AI mediation response
    const aiResponse = await this.generateAIMediation(
      allMessages,
      session.unpacking,
      session.couple.userA?.name || 'Partner A',
      session.couple.userB?.name || 'Partner B',
      pastContext,
      coupleOnboarding,
    );

    // Save AI message
    await this.prisma.reconnectionMessage.create({
      data: { sessionId, userId: null, role: 'ai', text: aiResponse },
    });

    // Notify partner about new message
    if (partnerId) {
      const partnerInfo = await this.prisma.user.findUnique({
        where: { id: partnerId },
        select: { pushToken: true, email: true },
      });
      this.notificationsService
        .send({
          userId: partnerId,
          type: 'reconnection_turn',
          title: `${userName || 'Your partner'} shared something`,
          body: 'New message in your reconnection conversation.',
          pushToken: partnerInfo?.pushToken || undefined,
          email: partnerInfo?.email || undefined,
          channels: ['push'],
          data: { sessionId },
        })
        .catch(() => {});
    }

    return { success: true };
  }

  private async generateAIMediation(
    messages: Array<{ role: string; text: string }>,
    unpacking: any,
    partnerAName: string,
    partnerBName: string,
    pastContext?: string | null,
    coupleOnboarding?: Record<string, any> | null,
  ): Promise<string> {
    const conversationHistory = messages.map((m) => ({
      role: (m.role === 'ai' ? 'assistant' : 'user') as 'assistant' | 'user',
      content:
        m.role === 'ai'
          ? m.text
          : `[${m.role === 'user_a' ? partnerAName : partnerBName}]: ${m.text}`,
    }));

    const unpackingContext = unpacking
      ? `
UNPACKING INSIGHTS (use these to guide the conversation):
- What happened: ${unpacking.surfaceConflict || 'N/A'}
- ${partnerAName}'s experience: ${unpacking.partnerAExperience || 'N/A'}
- ${partnerBName}'s experience: ${unpacking.partnerBExperience || 'N/A'}
- Shared truths: ${JSON.stringify(unpacking.sharedTruths || [])}
- Deeper insight: ${unpacking.deeperInsight || 'N/A'}
`
      : '';

    const pastContextBlock = pastContext
      ? `\n\nYou have context from this couple's previous sessions. Reference recurring patterns and past commitments when relevant. Build on previous insights — don't repeat them.\n\n${pastContext}\n`
      : '';

    // Count human messages to determine conversation stage
    const humanMessageCount = messages.filter((m) => m.role !== 'ai').length;
    const offlineNudge = humanMessageCount >= 6
      ? `\nThe conversation has had ${humanMessageCount} messages. Gently suggest they continue this conversation in person or on a call — something like "You're making real progress. When you're ready, maybe take this to a call or sit down together — hearing each other's voice makes all the difference."`
      : '';

    // Build couple personality context from onboarding
    let coupleProfileBlock = '';
    if (coupleOnboarding) {
      const a = coupleOnboarding.userA || {};
      const b = coupleOnboarding.userB || {};
      const lines: string[] = ['\nCOUPLE DYNAMICS (use silently to guide better — never reference directly):'];
      if (a.communicationStyles?.length) lines.push(`- ${partnerAName} in conflict: ${a.communicationStyles.join(', ')}`);
      if (a.conflictFeelings?.length) lines.push(`- ${partnerAName}'s raw spots: feeling ${a.conflictFeelings.join(', ')}`);
      if (b.communicationStyles?.length) lines.push(`- ${partnerBName} in conflict: ${b.communicationStyles.join(', ')}`);
      if (b.conflictFeelings?.length) lines.push(`- ${partnerBName}'s raw spots: feeling ${b.conflictFeelings.join(', ')}`);
      lines.push('');
      lines.push('USE THIS TO:');
      lines.push('- If one partner withdraws, gently invite them back without pressure');
      lines.push('- If one partner pursues, validate their need while creating space for the other');
      lines.push('- Connect reactions to values: "That matters to you because..."');
      lines.push('- Bridge the gap: help each partner see what the other is really asking for underneath their words');
      if (lines.length > 2) coupleProfileBlock = lines.join('\n');
    }

    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: `You are "relate", a relationship mediator guiding ${partnerAName} and ${partnerBName} through a reconnection conversation. Both partners have already shared their perspectives privately, and you have insights from their individual sessions.

${unpackingContext}${pastContextBlock}${coupleProfileBlock}

YOUR ROLE:
- Help them hear each other and find common ground
- Validate both perspectives without taking sides
- Guide them toward understanding, not winning
- Your goal is to help them reconnect enough to continue on their own, not to mediate every exchange

IMPORTANT RULES:
- NEVER start your message with a name in brackets like "[${partnerAName}]:" or "[${partnerBName}]:" — you are "relate", speak directly without any name prefix. The UI already labels your messages.
- Keep responses to 1-2 sentences maximum
- After the conversation has 6+ messages from the partners, gently suggest they continue the conversation in person or on a call
- Be warm and genuine, like a wise friend, not a therapist
- Reference specific things they or their partner said
- Never repeat the same prompt twice
- Mix between: reflective questions, gentle challenges, bridging statements, and appreciation
- If tension rises, slow things down: "Let's pause here. Take a breath."
- If they're making progress, name it: "You're really hearing each other right now."${offlineNudge}`,
        },
        ...conversationHistory,
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    return (
      response.choices[0].message.content ||
      'Take a moment to reflect on what was just shared.'
    );
  }

  /**
   * Generate an AI opening message for the reconnection conversation.
   * Called when there are no messages yet — sets the tone and invites partners to begin.
   */
  private async generateOpeningMessage(session: any): Promise<string> {
    const partnerAName = session.couple?.userA?.name || 'Partner A';
    const partnerBName = session.couple?.userB?.name || 'Partner B';
    const topic = session.topic || 'your recent conversation';

    // If we have unpacking insights, reference them
    let unpackingRef = '';
    if (session.unpacking && session.unpacking.surfaceConflict !== 'Pending AI unpacking') {
      unpackingRef = ` You both took the time to share your perspectives on "${session.unpacking.surfaceConflict}". That takes real courage.`;
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are "relate", a warm relationship mediator. Generate a brief opening message (2-3 sentences) for a reconnection conversation between ${partnerAName} and ${partnerBName}.

Context: They both privately shared their sides about "${topic}".${unpackingRef}

RULES:
- NEVER start with a name in brackets like "[${partnerAName}]:"
- Acknowledge both partners are here and that sharing took courage
- Reference the topic briefly
- Invite them to start talking: "Who'd like to go first?"
- Be warm and genuine, like a wise friend
- Keep it to 2-3 sentences max`,
          },
          { role: 'user', content: 'Generate the opening message.' },
        ],
        temperature: 0.7,
        max_tokens: 120,
      });

      return (
        response.choices[0].message.content ||
        `You both showed up, and that matters. You've each shared your side — now let's talk through this together. Who'd like to start?`
      );
    } catch {
      return `You both showed up, and that matters. You've each shared your side — now let's talk through this together. Who'd like to start?`;
    }
  }

  async generateCommitment(sessionId: string) {
    const session = await this.prisma.session.findUniqueOrThrow({
      where: { id: sessionId },
      include: {
        couple: { include: { userA: true, userB: true } },
        unpacking: true,
      },
    });

    const messages = await this.prisma.reconnectionMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });

    const partnerAName = session.couple.userA?.name || 'Partner A';
    const partnerBName = session.couple.userB?.name || 'Partner B';

    const transcript = messages
      .map((m) => {
        if (m.role === 'ai') return `[Mediator]: ${m.text}`;
        return `[${m.role === 'user_a' ? partnerAName : partnerBName}]: ${m.text}`;
      })
      .join('\n');

    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: `Based on this reconnection conversation between ${partnerAName} and ${partnerBName}, generate a shared commitment/learning they can both agree to.

Format: "When [trigger situation], [partner A commitment]. When [trigger situation], [partner B commitment]."

Keep it specific, actionable, and under 3 sentences. Use their actual names. Reference specific things discussed.`,
        },
        { role: 'user', content: transcript },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    const commitmentText =
      response.choices[0].message.content ||
      `When conflict arises, ${partnerAName} will express needs clearly, and ${partnerBName} will listen without interrupting.`;

    const commitment = await this.prisma.commitment.upsert({
      where: { sessionId },
      create: { sessionId, text: commitmentText },
      update: { text: commitmentText },
    });

    return commitment;
  }

  async agreeToCommitment(sessionId: string, userId: string) {
    const session = await this.prisma.session.findUniqueOrThrow({
      where: { id: sessionId },
      include: { couple: true },
    });

    const isUserA = userId === session.couple.userAId;
    const updateData = isUserA
      ? { userAAgreed: true, userAAgreedAt: new Date() }
      : { userBAgreed: true, userBAgreedAt: new Date() };

    const commitment = await this.prisma.commitment.update({
      where: { sessionId },
      data: updateData,
    });

    // If both agreed, mark session as resolved
    if (commitment.userAAgreed && commitment.userBAgreed) {
      await this.prisma.session.update({
        where: { id: sessionId },
        data: { status: 'resolved' },
      });
    }

    return commitment;
  }
}
