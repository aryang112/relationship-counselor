/**
 * Unpacking pipeline smoke test (end-to-end).
 *
 * Prereqs:
 * - Backend API running (default http://localhost:3000)
 * - Redis running and reachable by backend + worker (REDIS_URL or HOST/PORT)
 * - Worker running (processes `unpacking` queue)
 * - OPENAI_API_KEY set (worker uses it), DATABASE_URL set for backend/worker
 *
 * Run:
 *   npx ts-node backend/scripts/unpacking-pipeline-smoke.ts
 *
 * What it does:
 * - Registers two users, forms couple, both sign agreement
 * - Creates a session, submits both interviews
 * - Polls /sessions/:id/unpacking until AI-generated content is present
 */
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

type AuthUser = { user: any; token: string };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function http<T>(
  method: 'GET' | 'POST' | 'PATCH',
  url: string,
  token?: string,
  body?: any,
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${url} failed: ${res.status} ${text}`);
  }

  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as unknown as T);
}

async function registerUser(email: string, name: string): Promise<AuthUser> {
  const result = await http<{ user: any; accessToken: string }>('POST', `${BASE_URL}/auth/register`, undefined, {
    email,
    password: 'password123',
    name,
  });
  return { user: result.user, token: result.accessToken };
}

async function main() {
  console.log('🚀 Starting unpacking pipeline smoke test...');

  const suffix = Date.now();
  const emailA = `alice+${suffix}@example.com`;
  const emailB = `bob+${suffix}@example.com`;

  console.log('Registering users...');
  const userA = await registerUser(emailA, 'Alice Smoke');
  const userB = await registerUser(emailB, 'Bob Smoke');

  console.log('Creating invite...');
  const invite = await http<{ inviteToken: string }>('POST', `${BASE_URL}/couples/invite`, userA.token);

  console.log('Accepting invite and forming couple...');
  await http('POST', `${BASE_URL}/couples/accept`, userB.token, { inviteToken: invite.inviteToken });

  console.log('Signing agreement (both partners)...');
  await http('POST', `${BASE_URL}/couples/agreement`, userA.token, { confirm: true });
  await http('POST', `${BASE_URL}/couples/agreement`, userB.token, { confirm: true });

  console.log('Creating session...');
  const session = await http<{ id: string }>('POST', `${BASE_URL}/sessions`, userA.token, {
    topic: null,
    context: null,
  });

  const partnerAScenario =
    "We were talking about finances, and I asked him about the size of his portfolio. He is hesitant to tell me his portfolio size even after me asking for so long. He says it's higher than this or that, but never gives an exact number. Whenever he asks me about an expense and I don't tell him, he gets upset.";

  const partnerBScenario =
    "I don't like talking about my portfolio with anyone. She's my fiancée, so I can tell her a rough estimate, and when we're married she will know. All the hard work building that portfolio is for her; I'll spend it on activities with her. She should trust me and stop getting angry.";

  console.log('Submitting interviews (both partners)...');
  await http('POST', `${BASE_URL}/sessions/${session.id}/interview`, userA.token, {
    responses: { perspective: 'A', narrative: partnerAScenario },
  });
  await http('POST', `${BASE_URL}/sessions/${session.id}/interview`, userB.token, {
    responses: { perspective: 'B', narrative: partnerBScenario },
  });

  console.log('Polling for unpacking generation (worker)...');
  const unpacking = await pollForUnpacking(session.id, userA.token);

  console.log('✅ Unpacking generated:');
  console.log(JSON.stringify(unpacking, null, 2));
}

async function pollForUnpacking(sessionId: string, token: string) {
  const maxAttempts = 20;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await http<any>('GET', `${BASE_URL}/sessions/${sessionId}/unpacking`, token);

    // API returns { locked: boolean, unpacking: {...} }
    const unpacking = response?.unpacking;
    const summary = unpacking?.surfaceConflict || '';
    const deeper = unpacking?.deeperInsight || '';
    const truths = Array.isArray(unpacking?.sharedTruths) ? unpacking.sharedTruths.length : 0;

    const hasGenerated =
      (!!summary && !/pending ai unpacking/i.test(summary)) ||
      (!!deeper && !/pending ai unpacking/i.test(deeper)) ||
      truths > 0;

    if (hasGenerated) {
      return unpacking;
    }

    console.log(`Attempt ${attempt}/${maxAttempts}: still waiting for unpacking...`);
    await sleep(3000);
  }

  throw new Error('Timed out waiting for unpacking to be generated. Is the worker running?');
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Smoke test failed:', err);
    process.exit(1);
  });
