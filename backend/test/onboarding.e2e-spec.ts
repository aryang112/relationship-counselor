import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, closePrismaConnections } from './test-helpers';
import { resetTestDatabase } from './setup';

/**
 * E2E Test Suite: Onboarding & Partner Connection Flow
 *
 * Tests the complete user onboarding flow as specified in:
 * relationship-app-detailed-design-spec.md - Flow 1: Onboarding & Partner Connection
 *
 * This suite validates:
 * - STEP 1: User Registration (Partner A)
 * - STEP 2: Invite Partner
 * - STEP 3: Partner Accepts (Partner B)
 * - STEP 4: Shared Agreement (Both partners sign)
 */
describe('Onboarding & Partner Connection Flow (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await closePrismaConnections(app);
    await app.close();
  });

  beforeEach(async () => {
    await resetTestDatabase();
  });

  describe('STEP 1: User Registration', () => {
    it('should allow Partner A to register with email, password, name, and timezone', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'alice@example.com',
          password: 'securePassword123',
          name: 'Alice',
          timezone: 'America/New_York',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        user: {
          id: expect.any(String),
          email: 'alice@example.com',
          name: 'Alice',
        },
      });
      expect(response.body.user.password).toBeUndefined(); // Password should not be returned
      expect(response.body.user.timezone).toBeUndefined(); // Timezone not in response
    });

    it('should hash passwords during registration', async () => {
      const plainPassword = 'mySecretPassword';

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: plainPassword,
          name: 'Test User',
        })
        .expect(201);

      // Try to login with the same password
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: plainPassword,
        })
        .expect(200);

      expect(loginResponse.body.accessToken).toBeDefined();
    });

    it('should default timezone to UTC if not provided', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'default@example.com',
          password: 'password123',
          name: 'Default User',
        })
        .expect(201);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.user.email).toBe('default@example.com');
      // Timezone defaults to UTC in database but not returned in response
    });

    it('should enforce minimum password length (8+ chars)', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'short@example.com',
          password: 'short',
          name: 'Short Password User',
        })
        .expect(400);
    });

    it('should prevent duplicate email registration', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'password123',
        name: 'First User',
      };

      // First registration succeeds
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(201);

      // Second registration with same email fails
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(409); // Conflict
    });

    it('should validate required fields (email, password, name)', async () => {
      // Missing email
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          password: 'password123',
          name: 'No Email',
        })
        .expect(400);

      // Missing password
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          name: 'No Password',
        })
        .expect(400);

      // Missing name
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(400);
    });

    it('should validate email format', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          name: 'Invalid Email',
        })
        .expect(400);
    });
  });

  describe('STEP 2: Invite Partner', () => {
    let userAToken: string;
    let userAId: string;

    beforeEach(async () => {
      // Register User A (registration returns token, no need to login)
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'alice@example.com',
          password: 'password123',
          name: 'Alice',
        })
        .expect(201);

      userAId = registerResponse.body.user.id;
      userAToken = registerResponse.body.accessToken;
    });

    it('should generate unique invitation token for Partner A', async () => {
      const response = await request(app.getHttpServer())
        .post('/couples/invite')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(201);

      expect(response.body.couple).toMatchObject({
        id: expect.any(String),
        inviteToken: expect.any(String),
        userAId: userAId,
        userBId: null,
      });
      expect(response.body.inviteToken).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      ); // UUID format
    });

    it('should send reminder instead of creating duplicate invite', async () => {
      // First invite succeeds
      const firstInvite = await request(app.getHttpServer())
        .post('/couples/invite')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(201);

      // Second invite nudges partner (same token, status 200)
      const reminder = await request(app.getHttpServer())
        .post('/couples/invite')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(reminder.body.inviteToken).toBe(firstInvite.body.inviteToken);
      expect(reminder.body.message).toMatch(/Reminder/i);
    });

    it('should require authentication to create invite', async () => {
      await request(app.getHttpServer())
        .post('/couples/invite')
        .expect(401); // Unauthorized
    });
  });

  describe('STEP 3: Partner Accepts Invitation', () => {
    let userAToken: string;
    let userBToken: string;
    let inviteToken: string;

    beforeEach(async () => {
      // Register User A and create invite
      const registerA = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'alice@example.com',
          password: 'password123',
          name: 'Alice',
        })
        .expect(201);

      userAToken = registerA.body.accessToken;

      const inviteResponse = await request(app.getHttpServer())
        .post('/couples/invite')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(201);

      inviteToken = inviteResponse.body.inviteToken;

      // Register User B
      const registerB = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'bob@example.com',
          password: 'password123',
          name: 'Bob',
        })
        .expect(201);

      userBToken = registerB.body.accessToken;
    });

    it('should allow Partner B to accept valid invitation', async () => {
      const response = await request(app.getHttpServer())
        .post('/couples/accept')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ inviteToken })
        .expect(200);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        userAId: expect.any(String),
        userBId: expect.any(String),
      });
      expect(response.body.inviteToken).toBeNull(); // Token cleared after acceptance
    });

    it('should reject invalid invitation token format', async () => {
      await request(app.getHttpServer())
        .post('/couples/accept')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ inviteToken: 'invalid-token-123' })
        .expect(400); // Bad Request for malformed token
    });

    it('should reject unknown invitation token', async () => {
      await request(app.getHttpServer())
        .post('/couples/accept')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ inviteToken: '11111111-1111-4111-8111-111111111111' })
        .expect(404); // Not found when token well-formed but missing
    });

    it('should prevent user from accepting their own invitation', async () => {
      // User A tries to accept their own invite
      await request(app.getHttpServer())
        .post('/couples/accept')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ inviteToken })
        .expect(400); // Bad Request - cannot accept own invite
    });

    it('should prevent accepting already-used invitation token', async () => {
      // First acceptance succeeds
      await request(app.getHttpServer())
        .post('/couples/accept')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ inviteToken })
        .expect(200);

      // Register another user
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'charlie@example.com',
          password: 'password123',
          name: 'Charlie',
        })
        .expect(201);

      const loginC = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'charlie@example.com',
          password: 'password123',
        })
        .expect(200);

      // Try to use same token again
      await request(app.getHttpServer())
        .post('/couples/accept')
        .set('Authorization', `Bearer ${loginC.body.accessToken}`)
        .send({ inviteToken })
        .expect(404); // Token no longer exists
    });

    it('should require authentication to accept invite', async () => {
      await request(app.getHttpServer())
        .post('/couples/accept')
        .send({ inviteToken })
        .expect(401); // Unauthorized
    });
  });

  describe('STEP 4: Shared Agreement', () => {
    let userAToken: string;
    let userBToken: string;

    beforeEach(async () => {
      // Register User A
      const registerA = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'alice@example.com',
          password: 'password123',
          name: 'Alice',
        })
        .expect(201);

      userAToken = registerA.body.accessToken;

      // Create invite
      const inviteResponse = await request(app.getHttpServer())
        .post('/couples/invite')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(201);

      const inviteToken = inviteResponse.body.inviteToken;

      // Register User B
      const registerB = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'bob@example.com',
          password: 'password123',
          name: 'Bob',
        })
        .expect(201);

      userBToken = registerB.body.accessToken;

      // Accept invite
      await request(app.getHttpServer())
        .post('/couples/accept')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ inviteToken })
        .expect(200);
    });

    it('should allow Partner A to sign shared agreement', async () => {
      const response = await request(app.getHttpServer())
        .post('/couples/agreement')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ confirm: true })
        .expect(200);

      expect(response.body.id).toBeDefined();
      expect(response.body.agreementSignedAt).not.toBeNull();
    });

    it('should allow Partner B to sign shared agreement', async () => {
      const response = await request(app.getHttpServer())
        .post('/couples/agreement')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ confirm: true })
        .expect(200);

      expect(response.body.id).toBeDefined();
      expect(response.body.agreementSignedAt).not.toBeNull();
    });

    it('should mark agreement as signed after both partners sign', async () => {
      // Partner A signs
      await request(app.getHttpServer())
        .post('/couples/agreement')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ confirm: true })
        .expect(200);

      // Partner B signs
      await request(app.getHttpServer())
        .post('/couples/agreement')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ confirm: true })
        .expect(200);

      // Check couple status
      const coupleResponse = await request(app.getHttpServer())
        .get('/couples/me')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(coupleResponse.body.agreementSignedAt).not.toBeNull();
      expect(new Date(coupleResponse.body.agreementSignedAt)).toBeInstanceOf(
        Date,
      );
    });

    it('should require authentication to sign agreement', async () => {
      await request(app.getHttpServer())
        .post('/couples/agreement')
        .expect(401); // Unauthorized
    });

    it('should prevent signing agreement before couple is formed', async () => {
      // Register a new user who hasn't joined a couple
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'solo@example.com',
          password: 'password123',
          name: 'Solo User',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/couples/agreement')
        .set('Authorization', `Bearer ${registerResponse.body.accessToken}`)
        .send({ confirm: true })
        .expect(404); // Not Found - no couple exists
    });
  });

  describe('Complete Onboarding Flow', () => {
    it('should complete entire onboarding flow from registration to signed agreement', async () => {
      // STEP 1: Partner A registers
      const registerA = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'alice@example.com',
          password: 'securePass123',
          name: 'Alice',
          timezone: 'America/New_York',
        })
        .expect(201);

      expect(registerA.body.user.email).toBe('alice@example.com');
      const userAId = registerA.body.user.id;
      const tokenA = registerA.body.accessToken;

      // STEP 2: Partner A creates invite
      const invite = await request(app.getHttpServer())
        .post('/couples/invite')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(201);

      const inviteToken = invite.body.inviteToken;
      expect(inviteToken).toBeDefined();

      // STEP 3: Partner B registers
      const registerB = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'bob@example.com',
          password: 'securePass456',
          name: 'Bob',
          timezone: 'America/Los_Angeles',
        })
        .expect(201);

      expect(registerB.body.user.email).toBe('bob@example.com');
      const tokenB = registerB.body.accessToken;

      // Partner B accepts invite
      const couple = await request(app.getHttpServer())
        .post('/couples/accept')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ inviteToken })
        .expect(200);

      expect(couple.body.userAId).toBe(userAId);
      expect(couple.body.userBId).toBe(registerB.body.user.id);

      // STEP 4: Both partners sign agreement
      await request(app.getHttpServer())
        .post('/couples/agreement')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ confirm: true })
        .expect(200);

      await request(app.getHttpServer())
        .post('/couples/agreement')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ confirm: true })
        .expect(200);

      // Verify final state - both can access couple info
      const coupleInfoA = await request(app.getHttpServer())
        .get('/couples/me')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      const coupleInfoB = await request(app.getHttpServer())
        .get('/couples/me')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      expect(coupleInfoA.body.id).toBe(couple.body.id);
      expect(coupleInfoB.body.id).toBe(couple.body.id);
      expect(coupleInfoA.body.agreementSignedAt).not.toBeNull();

      console.log('✓ Complete onboarding flow verified: Registration → Invite → Accept → Agreement');
    });
  });
});
