/**
 * Demo seed script for App Store screenshots.
 * Creates Alex & Rebecca — a long-distance couple navigating communication gaps.
 *
 * Usage: npx ts-node prisma/seed-demo.ts
 * Idempotent: deletes old demo data and re-creates fresh.
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Demo2026!';

const ALEX = {
  email: 'demo-a@relatetogether.app',
  name: 'Alex',
  gender: 'Male',
};

const REBECCA = {
  email: 'demo-b@relatetogether.app',
  name: 'Rebecca',
  gender: 'Female',
};

async function cleanup() {
  // Delete old demo data in correct order (foreign key constraints)
  // Also clean up old email variants from previous seed runs
  const allEmails = [ALEX.email, REBECCA.email, 'alex@relatehq.com', 'rebecca@relatehq.com', 'demo-partner-a@relatehq.com', 'demo-partner-b@relatehq.com'];
  for (const email of allEmails) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) continue;

    // Find couples where this user is involved
    const couples = await prisma.couple.findMany({
      where: { OR: [{ userAId: user.id }, { userBId: user.id }] },
      include: { sessions: true },
    });

    for (const couple of couples) {
      for (const session of couple.sessions) {
        await prisma.commitment.deleteMany({ where: { sessionId: session.id } });
        await prisma.reconnectionMessage.deleteMany({ where: { sessionId: session.id } });
        await prisma.unpacking.deleteMany({ where: { sessionId: session.id } });
        await prisma.interview.deleteMany({ where: { sessionId: session.id } });
      }
      await prisma.session.deleteMany({ where: { coupleId: couple.id } });
    }
    await prisma.couple.deleteMany({
      where: { OR: [{ userAId: user.id }, { userBId: user.id }] },
    });
    await prisma.consentLog.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { email } });
  }
  console.log('  Cleaned up old demo data');
}

async function main() {
  console.log('Seeding demo accounts (Alex & Rebecca)...\n');

  await cleanup();

  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);
  const now = new Date();
  const day = 24 * 60 * 60 * 1000;
  const hour = 60 * 60 * 1000;

  // ── Users ──────────────────────────────────────────────

  const alex = await prisma.user.create({
    data: {
      email: ALEX.email,
      password: hashedPassword,
      name: ALEX.name,
      gender: ALEX.gender,
      onboardingData: {
        conflictBehavior: 'go_silent',
        coreEmotion: 'overwhelmed',
        pursueWithdraw: 'pull_back',
        floodingThreshold: 'builds',
        coreFear: 'inadequacy',
        repairStyle: 'time_apart',
        recurringTheme: 'emotional_labor',
        communicationMedium: 'text',
      },
      tosVersionAgreed: '1.0.0',
      privacyVersionAgreed: '1.0.0',
      consentAgreedAt: new Date(now.getTime() - 30 * day),
      aiConsentAgreedAt: new Date(now.getTime() - 30 * day),
      dateOfBirthConfirmed: true,
      subscriptionTier: 'premium',
      subscriptionExpiresAt: new Date(now.getTime() + 365 * day),
      resolvedSessionCount: 2,
    },
  });
  console.log(`  Alex: ${alex.email} (${alex.id})`);

  const rebecca = await prisma.user.create({
    data: {
      email: REBECCA.email,
      password: hashedPassword,
      name: REBECCA.name,
      gender: REBECCA.gender,
      onboardingData: {
        conflictBehavior: 'get_louder',
        coreEmotion: 'scared',
        pursueWithdraw: 'push_harder',
        floodingThreshold: 'immediately',
        coreFear: 'abandonment',
        repairStyle: 'real_apology',
        recurringTheme: 'not_priority',
        communicationMedium: 'call',
      },
      tosVersionAgreed: '1.0.0',
      privacyVersionAgreed: '1.0.0',
      consentAgreedAt: new Date(now.getTime() - 30 * day),
      aiConsentAgreedAt: new Date(now.getTime() - 30 * day),
      dateOfBirthConfirmed: true,
      subscriptionTier: 'premium',
      subscriptionExpiresAt: new Date(now.getTime() + 365 * day),
      resolvedSessionCount: 2,
    },
  });
  console.log(`  Rebecca: ${rebecca.email} (${rebecca.id})`);

  // ── Couple ─────────────────────────────────────────────

  const couple = await prisma.couple.create({
    data: {
      userAId: alex.id,
      userBId: rebecca.id,
      datingStartDate: '2023-09-01',
      userASignedAt: new Date(now.getTime() - 30 * day),
      userBSignedAt: new Date(now.getTime() - 30 * day),
      onboardingData: {
        userA: {
          conflictBehavior: 'go_silent',
          coreEmotion: 'overwhelmed',
          pursueWithdraw: 'pull_back',
          floodingThreshold: 'builds',
          coreFear: 'inadequacy',
          repairStyle: 'time_apart',
          recurringTheme: 'emotional_labor',
          communicationMedium: 'text',
          partnerName: 'Rebecca',
          partnerGender: 'female',
        },
        userB: {
          conflictBehavior: 'get_louder',
          coreEmotion: 'scared',
          pursueWithdraw: 'push_harder',
          floodingThreshold: 'immediately',
          coreFear: 'abandonment',
          repairStyle: 'real_apology',
          recurringTheme: 'not_priority',
          communicationMedium: 'call',
          partnerName: 'Alex',
          partnerGender: 'male',
        },
      },
      loveBankEntries: [
        { id: '1', text: 'Stayed on FaceTime while I fell asleep after a rough day', createdAt: new Date(now.getTime() - 21 * day).toISOString(), addedBy: rebecca.id },
        { id: '2', text: 'Sent me a handwritten letter that arrived on my birthday', createdAt: new Date(now.getTime() - 18 * day).toISOString(), addedBy: alex.id },
        { id: '3', text: 'Surprised me with a visit when I got the promotion', createdAt: new Date(now.getTime() - 14 * day).toISOString(), addedBy: rebecca.id },
        { id: '4', text: 'Planned our entire anniversary weekend without me having to ask', createdAt: new Date(now.getTime() - 10 * day).toISOString(), addedBy: alex.id },
        { id: '5', text: 'Watched my favorite show together over video call even though he hates it', createdAt: new Date(now.getTime() - 6 * day).toISOString(), addedBy: rebecca.id },
        { id: '6', text: 'Made a playlist of songs that remind him of us and shared it', createdAt: new Date(now.getTime() - 3 * day).toISOString(), addedBy: alex.id },
        { id: '7', text: 'Ordered my favorite takeout to my door when I was stressed about work', createdAt: new Date(now.getTime() - 1 * day).toISOString(), addedBy: rebecca.id },
      ],
    },
  });
  console.log(`  Couple: ${couple.id}`);

  // ── Session 1 (RESOLVED) — The core LDR conflict ──────

  const session1 = await prisma.session.create({
    data: {
      coupleId: couple.id,
      status: 'resolved',
      initiatedBy: rebecca.id,
      topic: 'I feel like we\u2019re drifting apart and he doesn\u2019t notice',
      context: 'Long distance for 8 months. We used to talk every night but now he goes hours without texting and our calls feel rushed.',
      topicTag: 'Communication',
      topicTagGeneratedAt: new Date(now.getTime() - 5 * day),
      unpackingReadyAt: new Date(now.getTime() - 5 * day + 2 * hour),
      createdAt: new Date(now.getTime() - 5 * day),
    },
  });

  // Alex's interview — his side of the LDR communication gap
  // Format: { question, answer, timestamp } — each entry is one AI question + user response pair
  const alexS1Time = new Date(now.getTime() - 5 * day);
  await prisma.interview.create({
    data: {
      sessionId: session1.id,
      userId: alex.id,
      responses: [
        { question: 'Hey Alex. Rebecca started a session \u2014 sounds like something\u2019s been building up. What\u2019s your take on how things have been between you two?', answer: 'Honestly? I thought we were fine. I mean, yeah, we don\u2019t talk as much as we used to, but I figured that\u2019s just what happens when you settle into a rhythm. I didn\u2019t think it was a problem.', timestamp: new Date(alexS1Time.getTime() + 5 * 60000).toISOString() },
        { question: 'So from your side, the change in communication felt natural \u2014 not a sign of anything wrong?', answer: 'Exactly. I\u2019ve been slammed at work lately. Some nights I\u2019m so drained I can barely think, let alone have a deep conversation. I figured she\u2019d understand that. We\u2019ve talked about how busy this quarter is.', timestamp: new Date(alexS1Time.getTime() + 10 * 60000).toISOString() },
        { question: 'When she brings up wanting more communication, how does that land for you?', answer: 'It feels like pressure, honestly. Like no matter how much I give, it\u2019s not enough. I texted her during lunch, we talked for 20 minutes before bed \u2014 but she\u2019s upset because it wasn\u2019t an hour? It makes me feel like I\u2019m failing at something I\u2019m already trying at.', timestamp: new Date(alexS1Time.getTime() + 15 * 60000).toISOString() },
        { question: 'That\u2019s an important feeling \u2014 trying and still feeling like you\u2019re coming up short. Does part of you worry she doesn\u2019t see the effort you ARE putting in?', answer: 'Yeah. That\u2019s exactly it. I\u2019m not ignoring her. I\u2019m just exhausted. And when I do call, she\u2019s already upset, so the call feels tense. Then I dread the next one. It\u2019s becoming this cycle I don\u2019t know how to break.', timestamp: new Date(alexS1Time.getTime() + 20 * 60000).toISOString() },
      ],
      completedAt: new Date(now.getTime() - 5 * day + 1 * hour),
    },
  });

  // Rebecca's interview — her experience of the growing distance
  const rebeccaS1Time = new Date(now.getTime() - 5 * day + 30 * 60000);
  await prisma.interview.create({
    data: {
      sessionId: session1.id,
      userId: rebecca.id,
      responses: [
        { question: 'Hey Rebecca. I\u2019m here for you. Tell me what\u2019s been going on with you and Alex.', answer: 'We used to talk every night. Like really talk \u2014 about our days, our dreams, stupid stuff that made us laugh. Now I\u2019m lucky if I get a \u201chey, tired, talk tomorrow?\u201d text. It\u2019s like I\u2019m dating a notification.', timestamp: new Date(rebeccaS1Time.getTime() + 5 * 60000).toISOString() },
        { question: 'That shift from deep connection to surface-level check-ins \u2014 when did you first notice it?', answer: 'Maybe two months ago? He started this new project at work and suddenly everything changed. I get that he\u2019s busy. I\u2019m busy too. But I still make time because he\u2019s my priority. It doesn\u2019t feel like I\u2019m his.', timestamp: new Date(rebeccaS1Time.getTime() + 10 * 60000).toISOString() },
        { question: 'That word \u2014 priority. It sounds like this is about more than just call frequency.', answer: 'It is. Long distance is already hard. The only thing we have is our communication. If that goes, what\u2019s left? I can\u2019t hug him when I\u2019m sad. I can\u2019t sit next to him on the couch. All I have is his voice and his words, and he\u2019s giving me less and less of both.', timestamp: new Date(rebeccaS1Time.getTime() + 15 * 60000).toISOString() },
        { question: 'Have you been able to tell him that \u2014 that communication is your lifeline in the distance?', answer: 'I\u2019ve tried. But every time I bring it up, he gets defensive. Says I\u2019m not being understanding about his work. And then I feel guilty for having needs. But I\u2019m scared, honestly. I\u2019m scared that the distance is winning.', timestamp: new Date(rebeccaS1Time.getTime() + 20 * 60000).toISOString() },
      ],
      completedAt: new Date(now.getTime() - 5 * day + 1.5 * hour),
    },
  });
  console.log('  Session 1 interviews created');

  // Unpacking — the AI's deep analysis
  await prisma.unpacking.create({
    data: {
      sessionId: session1.id,
      surfaceConflict: 'You\u2019re arguing about texting and call frequency, but the real conflict is about feeling secure in the distance. Rebecca, when Alex goes quiet, it doesn\u2019t just feel like fewer texts \u2014 it feels like the relationship is shrinking. Alex, when Rebecca asks for more, it doesn\u2019t feel like love \u2014 it feels like a report card you\u2019re failing.',
      partnerAExperience: 'Alex, you\u2019re not checked out \u2014 you\u2019re overwhelmed. Work has consumed your bandwidth, and by the time you get to Rebecca, you\u2019re running on empty. The calls that used to recharge you now feel like another demand. And the worst part? You know she\u2019s hurting, which makes you feel guilty, which makes you pull back more.\n\nWhat Rebecca needs to understand: your silence isn\u2019t indifference. It\u2019s depletion. You\u2019re not choosing work over her \u2014 you\u2019re drowning in it.',
      partnerBExperience: 'Rebecca, you\u2019re doing the math that every long-distance partner does: if communication drops, does the relationship follow? You\u2019re not being needy \u2014 you\u2019re being realistic about what long distance requires. Your need for consistent connection isn\u2019t a flaw. It\u2019s the maintenance schedule for a relationship that can\u2019t rely on physical proximity.\n\nWhat Alex needs to understand: for you, a goodnight text isn\u2019t small talk. It\u2019s proof that the distance hasn\u2019t erased you from his day.',
      sharedTruths: [
        'You both want the same thing \u2014 to feel chosen by each other across the miles',
        'Alex shows love by pushing through exhaustion to call; Rebecca shows love by fighting for the connection',
        'The distance didn\u2019t create this gap \u2014 the unspoken expectations did',
        'Neither of you has told the other what \u201cenough\u201d actually looks like',
      ],
      deeperInsight: 'Here\u2019s the breakthrough: you\u2019ve never actually defined what good communication looks like for your relationship. Alex is measuring by effort (\u201cI called even though I was exhausted\u201d). Rebecca is measuring by consistency (\u201che used to call every night\u201d). You\u2019re both keeping score with different scorecards.\n\nThe fix isn\u2019t more calls or fewer expectations. It\u2019s creating a shared definition of connection that works for BOTH of you \u2014 one that Alex can sustain and Rebecca can count on.',
      patternRecognition: 'This is the #1 conflict in long-distance relationships: the demand-withdraw cycle. One partner asks for more connection (demand), the other feels pressured and pulls back (withdraw), which triggers more demand. About 65% of LDR couples experience this. Couples who break the cycle do it by replacing vague expectations with specific rituals.',
      tone: 'warm',
    },
  });
  console.log('  Session 1 unpacking created');

  // Reconnection messages — the partners talking it through
  const reconMsgs1 = [
    { userId: rebecca.id, role: 'user_b', text: 'I read through everything. The part about me measuring by consistency and you measuring by effort \u2014 I never thought about it that way. I didn\u2019t realize those exhausted calls were you pushing through for me.' },
    { userId: alex.id, role: 'user_a', text: 'And I didn\u2019t realize that a short goodnight text means that much to you. I thought you\u2019d rather I skip it than send something half-hearted. I\u2019ve been wrong about that.' },
    { userId: null as string | null, role: 'ai', text: 'This is a real shift. You\u2019re both seeing each other\u2019s intent for the first time. Alex, hearing that consistency matters more than length \u2014 does that change what feels doable for you?' },
    { userId: alex.id, role: 'user_a', text: 'Actually, yeah. I can absolutely send a goodnight text every night. And if we set like 3 nights a week for real calls, I can protect those. It\u2019s the open-ended \u201cwe should talk more\u201d that overwhelms me.' },
    { userId: rebecca.id, role: 'user_b', text: 'That\u2019s all I need. Knowing there\u2019s a rhythm I can count on. And on the other nights, even a voice memo or a photo from your day would make me smile. I don\u2019t need an hour. I need to know I\u2019m on your mind.' },
    { userId: null as string | null, role: 'ai', text: 'You just built something really important \u2014 a shared definition of connection. Three call nights, daily goodnight texts, and the freedom to vary the rest. That\u2019s sustainable love across distance.' },
  ];

  for (let i = 0; i < reconMsgs1.length; i++) {
    await prisma.reconnectionMessage.create({
      data: {
        sessionId: session1.id,
        userId: reconMsgs1[i].userId,
        role: reconMsgs1[i].role,
        text: reconMsgs1[i].text,
        createdAt: new Date(now.getTime() - 5 * day + 3 * hour + i * 5 * 60 * 1000),
      },
    });
  }
  console.log('  Session 1 reconnection created');

  // Commitment
  await prisma.commitment.create({
    data: {
      sessionId: session1.id,
      text: 'We\u2019ll keep three dedicated call nights a week and a daily goodnight text. On other nights, voice memos, photos, or a quick message \u2014 whatever feels natural. No guilt for busy days, but always a goodnight.',
      userAAgreed: true,
      userBAgreed: true,
      userAAgreedAt: new Date(now.getTime() - 5 * day + 4 * hour),
      userBAgreedAt: new Date(now.getTime() - 5 * day + 4 * hour + 10 * 60 * 1000),
    },
  });
  console.log('  Session 1 commitment created');

  // ── Session 2 (IN PROGRESS) — Trust & jealousy in LDR ──
  // Alex has completed his interview. Rebecca is PENDING — reviewer experiences live AI flow.

  const session2 = await prisma.session.create({
    data: {
      coupleId: couple.id,
      status: 'in_progress',
      initiatedBy: alex.id,
      topic: 'She got upset that I went to a party without telling her first',
      context: 'She saw on Instagram that I went to a coworker\u2019s birthday before I mentioned it. I wasn\u2019t hiding it \u2014 I just forgot to bring it up. But she felt like I was being secretive and it turned into a bigger conversation about transparency.',
      topicTag: 'Trust',
      topicTagGeneratedAt: new Date(now.getTime() - 1 * day),
      createdAt: new Date(now.getTime() - 1 * day),
    },
  });

  // Only Alex's interview — Rebecca's is pending for the reviewer to complete
  const alexS2Time = new Date(now.getTime() - 1 * day);
  await prisma.interview.create({
    data: {
      sessionId: session2.id,
      userId: alex.id,
      responses: [
        { question: 'Hey Alex. What\u2019s been going on?', answer: 'She saw on Instagram that I went to a coworker\u2019s birthday before I mentioned it. I wasn\u2019t hiding it \u2014 I just forgot to bring it up. But she felt like I was being secretive and it turned into a bigger conversation about transparency. I feel like I can\u2019t do anything without it becoming a trust issue.', timestamp: new Date(alexS2Time.getTime() + 5 * 60000).toISOString() },
        { question: 'That sounds frustrating. When she brought it up, how did the conversation go?', answer: 'She was hurt. Not angry exactly, more like... disappointed? She said \u201cI had to find out from Instagram.\u201d And I get why that stings. But I genuinely just forgot. It wasn\u2019t a secret. I posted it publicly.', timestamp: new Date(alexS2Time.getTime() + 10 * 60000).toISOString() },
        { question: 'Do you think there\u2019s a pattern here, or was this a one-off?', answer: 'Honestly, it\u2019s happened a few times. Not with parties specifically, but me forgetting to mention things. She says it makes her feel like she\u2019s not part of my daily life. And with the distance, I guess that hits harder.', timestamp: new Date(alexS2Time.getTime() + 15 * 60000).toISOString() },
        { question: 'What do you think she needs from you in these moments?', answer: 'Probably just a heads up. A quick text. It\u2019s not that hard, I just don\u2019t think about it in the moment. I\u2019m not used to narrating my life. But I can see why she\u2019d want that when we\u2019re apart.', timestamp: new Date(alexS2Time.getTime() + 20 * 60000).toISOString() },
      ],
      completedAt: new Date(now.getTime() - 1 * day + 1 * hour),
    },
  });
  console.log('  Session 2 created (Trust — Alex done, Rebecca pending)');

  // ── Consent logs ───────────────────────────────────────

  await prisma.consentLog.createMany({
    data: [
      { userId: alex.id, tosVersion: '1.0.0', privacyVersion: '1.0.0', agreedAt: new Date(now.getTime() - 30 * day), appVersion: '1.0.0', platform: 'ios' },
      { userId: rebecca.id, tosVersion: '1.0.0', privacyVersion: '1.0.0', agreedAt: new Date(now.getTime() - 30 * day), appVersion: '1.0.0', platform: 'ios' },
    ],
  });

  // ── Done ───────────────────────────────────────────────

  console.log('\n--- Demo seed complete! ---\n');
  console.log('Credentials:');
  console.log(`  Alex (Partner A):    ${ALEX.email} / ${DEMO_PASSWORD}`);
  console.log(`  Rebecca (Partner B): ${REBECCA.email} / ${DEMO_PASSWORD}`);
  console.log('\nScenario: Long-distance couple, 2.5 years together.');
  console.log('Session 1: Communication gap (RESOLVED) — fully completed with learning');
  console.log('Session 2: Trust (IN PROGRESS) — Alex done, Rebecca PENDING for reviewer');
  console.log('Love Bank: 7 entries showing long-distance love gestures');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
