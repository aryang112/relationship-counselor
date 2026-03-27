/**
 * seed-demo.ts — Creates demo accounts for Apple App Store review.
 *
 * Creates 2 demo users (alex + jordan), links them as a couple with
 * signed agreement + AI consent, and creates 1 completed session with
 * interview data for both partners.
 *
 * Usage: cd backend && npx ts-node scripts/seed-demo.ts
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'DemoPass123!';

const ALEX = {
  email: 'demo-alex@relate.app',
  name: 'Alex Demo',
  gender: 'Male',
};

const JORDAN = {
  email: 'demo-jordan@relate.app',
  name: 'Jordan Demo',
  gender: 'Female',
};

const ALEX_RESPONSES = [
  { question: 'What brings you here today?', answer: 'I feel like we keep arguing about household chores and neither of us feels heard.' },
  { question: 'Can you describe a recent situation that was difficult?', answer: 'Last weekend Jordan asked me to clean the kitchen and I said I would do it later, but then they got really upset that I hadn\'t done it by evening.' },
  { question: 'How did that make you feel?', answer: 'Frustrated and criticized. Like nothing I do is good enough or fast enough.' },
  { question: 'What do you think your partner was feeling?', answer: 'Probably overwhelmed and unsupported. They do a lot around the house.' },
  { question: 'What would make this better for you?', answer: 'If we could have a system where we each know what we\'re responsible for, instead of one person always asking the other.' },
  { question: 'Is there anything else you want your partner to understand?', answer: 'I really do care about keeping our home nice. I just have a different timeline for getting things done and I don\'t like being reminded repeatedly.' },
];

const JORDAN_RESPONSES = [
  { question: 'What brings you here today?', answer: 'The chore situation is really getting to me. I feel like I\'m carrying most of the mental load for our household.' },
  { question: 'Can you describe a recent situation that was difficult?', answer: 'I asked Alex to clean the kitchen Saturday morning, and by 8pm it still wasn\'t done. I ended up doing it myself while feeling resentful.' },
  { question: 'How did that make you feel?', answer: 'Exhausted and invisible. Like my requests don\'t matter or get taken seriously.' },
  { question: 'What do you think your partner was feeling?', answer: 'Maybe nagged or pressured. I know they don\'t like being reminded about things.' },
  { question: 'What would make this better for you?', answer: 'If Alex could follow through without me having to ask multiple times. Or even just acknowledge that the work needs to be done.' },
  { question: 'Is there anything else you want your partner to understand?', answer: 'I\'m not trying to control everything. I\'m just tired of being the only one who notices what needs to be done. I want to feel like we\'re a team.' },
];

async function main() {
  console.log('🌱 Seeding demo accounts...\n');

  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);
  const now = new Date();

  // Upsert Alex
  const alex = await prisma.user.upsert({
    where: { email: ALEX.email },
    update: {
      password: hashedPassword,
      name: ALEX.name,
      gender: ALEX.gender,
      aiConsentAgreedAt: now,
      tosVersionAgreed: '1.0.0',
      privacyVersionAgreed: '1.0.0',
      consentAgreedAt: now,
      dateOfBirthConfirmed: true,
      deletedAt: null,
    },
    create: {
      email: ALEX.email,
      password: hashedPassword,
      name: ALEX.name,
      gender: ALEX.gender,
      aiConsentAgreedAt: now,
      tosVersionAgreed: '1.0.0',
      privacyVersionAgreed: '1.0.0',
      consentAgreedAt: now,
      dateOfBirthConfirmed: true,
      onboardingData: {
        communicationStyles: ['I tend to pursue and push for resolution'],
        conflictFeelings: ['Frustrated', 'Unheard'],
        partnerName: 'Jordan',
        partnerGender: 'Female',
      },
    },
  });
  console.log(`✅ Alex: ${alex.id} (${alex.email})`);

  // Upsert Jordan
  const jordan = await prisma.user.upsert({
    where: { email: JORDAN.email },
    update: {
      password: hashedPassword,
      name: JORDAN.name,
      gender: JORDAN.gender,
      aiConsentAgreedAt: now,
      tosVersionAgreed: '1.0.0',
      privacyVersionAgreed: '1.0.0',
      consentAgreedAt: now,
      dateOfBirthConfirmed: true,
      deletedAt: null,
    },
    create: {
      email: JORDAN.email,
      password: hashedPassword,
      name: JORDAN.name,
      gender: JORDAN.gender,
      aiConsentAgreedAt: now,
      tosVersionAgreed: '1.0.0',
      privacyVersionAgreed: '1.0.0',
      consentAgreedAt: now,
      dateOfBirthConfirmed: true,
      onboardingData: {
        communicationStyles: ['I tend to withdraw and need space'],
        conflictFeelings: ['Overwhelmed', 'Invisible'],
        partnerName: 'Alex',
        partnerGender: 'Male',
      },
    },
  });
  console.log(`✅ Jordan: ${jordan.id} (${jordan.email})`);

  // Find or create couple
  let couple = await prisma.couple.findFirst({
    where: { userAId: alex.id, userBId: jordan.id },
  });

  if (!couple) {
    couple = await prisma.couple.create({
      data: {
        userAId: alex.id,
        userBId: jordan.id,
        userASignedAt: now,
        userBSignedAt: now,
        onboardingData: {
          datingStartDate: '2023-06-15',
          howMet: 'through-friends',
        },
      },
    });
    console.log(`✅ Couple created: ${couple.id}`);
  } else {
    await prisma.couple.update({
      where: { id: couple.id },
      data: { userASignedAt: now, userBSignedAt: now },
    });
    console.log(`✅ Couple exists: ${couple.id}`);
  }

  // Clean existing demo sessions for this couple
  const existingSessions = await prisma.session.findMany({
    where: { coupleId: couple.id },
    select: { id: true },
  });
  if (existingSessions.length > 0) {
    const sessionIds = existingSessions.map((s) => s.id);
    await prisma.unpacking.deleteMany({ where: { sessionId: { in: sessionIds } } });
    await prisma.interview.deleteMany({ where: { sessionId: { in: sessionIds } } });
    await prisma.session.deleteMany({ where: { id: { in: sessionIds } } });
    console.log(`🧹 Cleaned ${existingSessions.length} existing sessions`);
  }

  // Create completed session
  const session = await prisma.session.create({
    data: {
      coupleId: couple.id,
      status: 'unpacking_ready',
      initiatedBy: alex.id,
      topic: 'Household responsibilities',
      context: 'We keep arguing about chores and the mental load feels unbalanced.',
      topicTag: 'household responsibilities',
      topicTagGeneratedAt: now,
      partnerAExtraction: {
        topicTag: 'household responsibilities',
        issues: ['unequal chore distribution', 'different timelines for tasks', 'feeling criticized'],
        needs: ['autonomy', 'acknowledgment of effort', 'clear expectations'],
        emotions: ['frustrated', 'criticized', 'defensive'],
      },
    },
  });
  console.log(`✅ Session created: ${session.id}`);

  // Create Alex's interview
  await prisma.interview.create({
    data: {
      sessionId: session.id,
      userId: alex.id,
      responses: ALEX_RESPONSES,
      completedAt: now,
    },
  });
  console.log('✅ Alex interview created');

  // Create Jordan's interview
  await prisma.interview.create({
    data: {
      sessionId: session.id,
      userId: jordan.id,
      responses: JORDAN_RESPONSES,
      completedAt: now,
    },
  });
  console.log('✅ Jordan interview created');

  console.log('\n🎉 Demo seed complete!');
  console.log(`\n📋 Demo Credentials:`);
  console.log(`   Alex:   ${ALEX.email} / ${DEMO_PASSWORD}`);
  console.log(`   Jordan: ${JORDAN.email} / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
