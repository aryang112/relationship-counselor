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
      include: { couple: true, commitment: true },
    });

    const messages = await this.prisma.reconnectionMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });

    // Determine whose turn it is
    const isUserA = userId === session.couple.userAId;
    const lastMsg = messages.filter((m) => m.role !== 'ai').pop();
    let isMyTurn: boolean;

    if (!lastMsg) {
      // No messages yet — User A goes first
      isMyTurn = isUserA;
    } else {
      // Alternate turns: if last human message was from this user, it's partner's turn
      const lastWasMe =
        (lastMsg.role === 'user_a' && isUserA) ||
        (lastMsg.role === 'user_b' && !isUserA);
      isMyTurn = !lastWasMe;
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

    // Generate AI mediation response
    const aiResponse = await this.generateAIMediation(
      allMessages,
      session.unpacking,
      session.couple.userA?.name || 'Partner A',
      session.couple.userB?.name || 'Partner B',
    );

    // Save AI message
    await this.prisma.reconnectionMessage.create({
      data: { sessionId, userId: null, role: 'ai', text: aiResponse },
    });

    // Notify partner it's their turn
    if (partnerId) {
      const partnerInfo = await this.prisma.user.findUnique({
        where: { id: partnerId },
        select: { pushToken: true, email: true },
      });
      this.notificationsService
        .send({
          userId: partnerId,
          type: 'reconnection_turn',
          title: `${userName || 'Your partner'} shared their thoughts`,
          body: "It's your turn to respond in the reconnection.",
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

    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: `You are a relationship mediator guiding ${partnerAName} and ${partnerBName} through a reconnection conversation. Both partners have already shared their perspectives privately, and you have insights from their individual sessions.

${unpackingContext}

YOUR ROLE:
- Help them hear each other and find common ground
- Validate both perspectives without taking sides
- Guide them toward understanding, not winning
- Keep prompts SHORT (1-2 sentences max)
- After 3-4 exchanges from each partner, suggest they formulate a shared commitment/learning

RESPONSE RULES:
- Address the person whose turn is NEXT (the one who hasn't spoken most recently)
- Reference specific things they or their partner said
- Never repeat the same prompt twice
- Mix between: reflective questions, gentle challenges, bridging statements, and appreciation
- If tension rises, slow things down: "Let's pause here. Take a breath."
- If they're making progress, name it: "You're really hearing each other right now."
- Keep it warm, genuine, and conversational — not clinical`,
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
