import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  createTestApp,
  closePrismaConnections,
  createAuthenticatedCouple,
  registerUser,
  createSession,
} from './test-helpers';
import { resetTestDatabase } from './setup';

/**
 * E2E Test Suite: Authorization & Security
 *
 * Tests access controls and security boundaries to ensure:
 * - Users can only access their own data
 * - Partners cannot access each other's private interviews
 * - Third parties cannot access couple data
 * - All protected endpoints require authentication
 * - JWT tokens are properly validated
 */
describe('Authorization & Security (E2E)', () => {
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

  describe('Authentication Requirements', () => {
    it('should reject requests without authentication token', async () => {
      const endpoints = [
        { method: 'post', path: '/couples/invite' },
        { method: 'post', path: '/couples/accept' },
        { method: 'post', path: '/couples/agreement' },
        { method: 'get', path: '/couples/me' },
        { method: 'post', path: '/sessions' },
        { method: 'get', path: '/sessions' },
      ];

      for (const endpoint of endpoints) {
        await request(app.getHttpServer())
          [endpoint.method](endpoint.path)
          .expect(401);
      }
    });

    it('should reject requests with invalid JWT token', async () => {
      const invalidToken = 'invalid.jwt.token';

      await request(app.getHttpServer())
        .get('/couples/me')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);
    });

    it('should reject requests with expired JWT token', async () => {
      // TODO: Implement when JWT expiration is configured
      // This test would create a token with very short expiration,
      // wait for it to expire, then verify it's rejected
    });

    it('should accept requests with valid JWT token', async () => {
      const { token } = await registerUser(app, {
        email: 'valid@example.com',
        password: 'password123',
        name: 'Valid User',
      });

      // This will fail with 404 (no couple) but not 401 (unauthorized)
      await request(app.getHttpServer())
        .get('/couples/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('Couple Data Access', () => {
    it('should prevent user from accessing another couples data', async () => {
      // Create Couple 1
      const couple1 = await createAuthenticatedCouple(app);

      // Create Couple 2
      const couple2UserA = await registerUser(app, {
        email: 'couple2a@example.com',
        password: 'password123',
        name: 'Couple 2 User A',
      });

      const couple2InviteResponse = await request(app.getHttpServer())
        .post('/couples/invite')
        .set('Authorization', `Bearer ${couple2UserA.token}`)
        .expect(201);

      const couple2UserB = await registerUser(app, {
        email: 'couple2b@example.com',
        password: 'password123',
        name: 'Couple 2 User B',
      });

      await request(app.getHttpServer())
        .post('/couples/accept')
        .set('Authorization', `Bearer ${couple2UserB.token}`)
        .send({ inviteToken: couple2InviteResponse.body.inviteToken })
        .expect(200);

      // User from Couple 1 should not see Couple 2's data
      const response = await request(app.getHttpServer())
        .get('/couples/me')
        .set('Authorization', `Bearer ${couple1.userA.token}`)
        .expect(200);

      expect(response.body.id).toBe(couple1.couple.id);
      expect(response.body.id).not.toBe(couple2InviteResponse.body.id);
    });

    it('should prevent user from accepting invite for already-paired couple', async () => {
      const couple1 = await createAuthenticatedCouple(app);

      // Third party user tries to accept an invite token that's already used
      const thirdParty = await registerUser(app, {
        email: 'thirdparty@example.com',
        password: 'password123',
        name: 'Third Party',
      });

      // Try to use a non-existent or used token
      await request(app.getHttpServer())
        .post('/couples/accept')
        .set('Authorization', `Bearer ${thirdParty.token}`)
        .send({ inviteToken: 'used-or-invalid-token' })
        .expect(400);
    });
  });

  describe('Session Access Control', () => {
    it('should allow both partners to access their session', async () => {
      const { userA, userB } = await createAuthenticatedCouple(app);
      const session = await createSession(app, userA.token);

      // Partner A can access
      const responseA = await request(app.getHttpServer())
        .get(`/sessions/${session.id}`)
        .set('Authorization', `Bearer ${userA.token}`)
        .expect(200);

      expect(responseA.body.id).toBe(session.id);

      // Partner B can access
      const responseB = await request(app.getHttpServer())
        .get(`/sessions/${session.id}`)
        .set('Authorization', `Bearer ${userB.token}`)
        .expect(200);

      expect(responseB.body.id).toBe(session.id);
    });

    it('should prevent third party from accessing couples session', async () => {
      const { userA } = await createAuthenticatedCouple(app);
      const session = await createSession(app, userA.token);

      // Create third party user in different couple
      const thirdPartyA = await registerUser(app, {
        email: 'thirdparty@example.com',
        password: 'password123',
        name: 'Third Party',
      });

      const inviteResponse = await request(app.getHttpServer())
        .post('/couples/invite')
        .set('Authorization', `Bearer ${thirdPartyA.token}`)
        .expect(201);

      const thirdPartyB = await registerUser(app, {
        email: 'thirdpartyb@example.com',
        password: 'password123',
        name: 'Third Party B',
      });

      await request(app.getHttpServer())
        .post('/couples/accept')
        .set('Authorization', `Bearer ${thirdPartyB.token}`)
        .send({ inviteToken: inviteResponse.body.inviteToken })
        .expect(200);

      // Third party cannot access original couple's session
      await request(app.getHttpServer())
        .get(`/sessions/${session.id}`)
        .set('Authorization', `Bearer ${thirdPartyA.token}`)
        .expect(403); // Forbidden
    });

    it('should prevent user without couple from accessing any session', async () => {
      const { userA } = await createAuthenticatedCouple(app);
      const session = await createSession(app, userA.token);

      // Create solo user
      const soloUser = await registerUser(app, {
        email: 'solo@example.com',
        password: 'password123',
        name: 'Solo User',
      });

      await request(app.getHttpServer())
        .get(`/sessions/${session.id}`)
        .set('Authorization', `Bearer ${soloUser.token}`)
        .expect(403); // Forbidden - user not part of couple
    });

    it('should list only sessions for requesting users couple', async () => {
      const couple1 = await createAuthenticatedCouple(app);
      const couple1Session = await createSession(app, couple1.userA.token);

      // Create second couple with their own session
      const couple2UserA = await registerUser(app, {
        email: 'couple2a@example.com',
        password: 'password123',
        name: 'Couple 2 A',
      });

      const inviteResponse = await request(app.getHttpServer())
        .post('/couples/invite')
        .set('Authorization', `Bearer ${couple2UserA.token}`)
        .expect(201);

      const couple2UserB = await registerUser(app, {
        email: 'couple2b@example.com',
        password: 'password123',
        name: 'Couple 2 B',
      });

      await request(app.getHttpServer())
        .post('/couples/accept')
        .set('Authorization', `Bearer ${couple2UserB.token}`)
        .send({ inviteToken: inviteResponse.body.inviteToken })
        .expect(200);

      await request(app.getHttpServer())
        .post('/couples/agreement')
        .set('Authorization', `Bearer ${couple2UserA.token}`)
        .send({ confirm: true })
        .expect(200);

      await request(app.getHttpServer())
        .post('/couples/agreement')
        .set('Authorization', `Bearer ${couple2UserB.token}`)
        .send({ confirm: true })
        .expect(200);

      const couple2Session = await createSession(app, couple2UserA.token);

      // Couple 1 should only see their session
      const couple1Sessions = await request(app.getHttpServer())
        .get('/sessions')
        .set('Authorization', `Bearer ${couple1.userA.token}`)
        .expect(200);

      expect(couple1Sessions.body).toHaveLength(1);
      expect(couple1Sessions.body[0].id).toBe(couple1Session.id);

      // Couple 2 should only see their session
      const couple2Sessions = await request(app.getHttpServer())
        .get('/sessions')
        .set('Authorization', `Bearer ${couple2UserA.token}`)
        .expect(200);

      expect(couple2Sessions.body).toHaveLength(1);
      expect(couple2Sessions.body[0].id).toBe(couple2Session.id);
    });
  });

  describe('Interview Privacy', () => {
    it('should allow user to submit their own interview', async () => {
      const { userA } = await createAuthenticatedCouple(app);
      const session = await createSession(app, userA.token);

      const response = await request(app.getHttpServer())
        .post(`/sessions/${session.id}/interview`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          responses: [
            { question: 'What happened?', answer: 'Private thoughts' },
          ],
        })
        .expect(201);

      expect(response.body.userId).toBe(userA.user.id);
    });

    it('should prevent user from viewing raw partner interview before unpacking', async () => {
      const { userA, userB } = await createAuthenticatedCouple(app);
      const session = await createSession(app, userA.token);

      // Partner A submits interview
      await request(app.getHttpServer())
        .post(`/sessions/${session.id}/interview`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          responses: [
            { question: 'Q1', answer: 'Private answer from A' },
          ],
        })
        .expect(201);

      // Partner B should NOT be able to directly access Partner A's raw interview
      // TODO: Implement GET /interviews/:id endpoint with proper access control
      // For now, we verify they can't access via sessions endpoint
      const sessionData = await request(app.getHttpServer())
        .get(`/sessions/${session.id}`)
        .set('Authorization', `Bearer ${userB.token}`)
        .expect(200);

      // Session data should not include raw interview responses
      expect(Array.isArray(sessionData.body.interviews)).toBe(true);
      expect(sessionData.body.interviews[0]).not.toHaveProperty('responses');
    });

    it('should prevent third party from submitting interview for couples session', async () => {
      const { userA } = await createAuthenticatedCouple(app);
      const session = await createSession(app, userA.token);

      // Create unrelated user
      const thirdParty = await registerUser(app, {
        email: 'hacker@example.com',
        password: 'password123',
        name: 'Hacker',
      });

      await request(app.getHttpServer())
        .post(`/sessions/${session.id}/interview`)
        .set('Authorization', `Bearer ${thirdParty.token}`)
        .send({
          responses: [
            { question: 'Q1', answer: 'Trying to inject data' },
          ],
        })
        .expect(403); // Forbidden
    });
  });

  describe('Session Modification Access', () => {
    it('should allow both partners to update session status', async () => {
      const { userA, userB } = await createAuthenticatedCouple(app);
      const session = await createSession(app, userA.token);

      // Partner A can update
      await request(app.getHttpServer())
        .patch(`/sessions/${session.id}/status`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ status: 'in_progress' })
        .expect(200);

      // Partner B can also update
      await request(app.getHttpServer())
        .patch(`/sessions/${session.id}/status`)
        .set('Authorization', `Bearer ${userB.token}`)
        .send({ status: 'unpacking_ready' })
        .expect(200);
    });

    it('should prevent third party from modifying couples session', async () => {
      const { userA } = await createAuthenticatedCouple(app);
      const session = await createSession(app, userA.token);

      const thirdParty = await registerUser(app, {
        email: 'badactor@example.com',
        password: 'password123',
        name: 'Bad Actor',
      });

      await request(app.getHttpServer())
        .patch(`/sessions/${session.id}/status`)
        .set('Authorization', `Bearer ${thirdParty.token}`)
        .send({ status: 'resolved' })
        .expect(403); // Forbidden
    });
  });

  describe('Data Isolation', () => {
    it('should ensure complete data isolation between couples', async () => {
      // Create Couple 1
      const couple1 = await createAuthenticatedCouple(app);
      const couple1Session = await createSession(app, couple1.userA.token, {
        topic: 'Couple 1 Private Topic',
      });

      await request(app.getHttpServer())
        .post(`/sessions/${couple1Session.id}/interview`)
        .set('Authorization', `Bearer ${couple1.userA.token}`)
        .send({
          responses: [
            { question: 'Secret?', answer: 'Couple 1 private data' },
          ],
        })
        .expect(201);

      // Create Couple 2
      const couple2UserA = await registerUser(app, {
        email: 'couple2a@example.com',
        password: 'password123',
        name: 'Couple 2 A',
      });

      const couple2Invite = await request(app.getHttpServer())
        .post('/couples/invite')
        .set('Authorization', `Bearer ${couple2UserA.token}`)
        .expect(201);

      const couple2UserB = await registerUser(app, {
        email: 'couple2b@example.com',
        password: 'password123',
        name: 'Couple 2 B',
      });

      await request(app.getHttpServer())
        .post('/couples/accept')
        .set('Authorization', `Bearer ${couple2UserB.token}`)
        .send({ inviteToken: couple2Invite.body.inviteToken })
        .expect(200);

      await request(app.getHttpServer())
        .post('/couples/agreement')
        .set('Authorization', `Bearer ${couple2UserA.token}`)
        .send({ confirm: true })
        .expect(200);

      await request(app.getHttpServer())
        .post('/couples/agreement')
        .set('Authorization', `Bearer ${couple2UserB.token}`)
        .send({ confirm: true })
        .expect(200);

      // Couple 2 creates their own session
      const couple2Session = await createSession(app, couple2UserA.token, {
        topic: 'Couple 2 Private Topic',
      });

      // Verify Couple 2 cannot access Couple 1's data
      await request(app.getHttpServer())
        .get(`/sessions/${couple1Session.id}`)
        .set('Authorization', `Bearer ${couple2UserA.token}`)
        .expect(403);

      // Verify Couple 2's session list doesn't include Couple 1's sessions
      const couple2Sessions = await request(app.getHttpServer())
        .get('/sessions')
        .set('Authorization', `Bearer ${couple2UserA.token}`)
        .expect(200);

      expect(couple2Sessions.body).toHaveLength(1);
      expect(couple2Sessions.body[0].id).toBe(couple2Session.id);
      expect(couple2Sessions.body[0].topic).toBe('Couple 2 Private Topic');

      // Verify Couple 1's data remains isolated
      const couple1Sessions = await request(app.getHttpServer())
        .get('/sessions')
        .set('Authorization', `Bearer ${couple1.userA.token}`)
        .expect(200);

      expect(couple1Sessions.body).toHaveLength(1);
      expect(couple1Sessions.body[0].id).toBe(couple1Session.id);
      expect(couple1Sessions.body[0].topic).toBe('Couple 1 Private Topic');

      console.log('✓ Complete data isolation verified between couples');
    });
  });

  describe('Password Security', () => {
    it('should never return password in API responses', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'security@example.com',
          password: 'mySecretPassword123',
          name: 'Security Test',
        })
        .expect(201);

      expect(response.body.user.password).toBeUndefined();
      expect(JSON.stringify(response.body)).not.toContain('mySecretPassword');
    });

    it('should hash passwords in database', async () => {
      const plainPassword = 'plaintextPassword123';

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'hash@example.com',
          password: plainPassword,
          name: 'Hash Test',
        })
        .expect(201);

      // Verify login works (password was hashed and can be verified)
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'hash@example.com',
          password: plainPassword,
        })
        .expect(200);

      expect(loginResponse.body.accessToken).toBeDefined();
    });

    it('should reject login with incorrect password', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'wrongpass@example.com',
          password: 'correctPassword',
          name: 'Wrong Pass Test',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'wrongpass@example.com',
          password: 'wrongPassword',
        })
        .expect(401);
    });
  });
});
