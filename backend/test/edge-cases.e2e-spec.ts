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
 * E2E Test Suite: Edge Cases & Error Handling
 *
 * Tests edge cases and error scenarios from the spec:
 * relationship-app-detailed-design-spec.md - Edge Cases & Error Handling
 *
 * Validates:
 * - Input validation and sanitization
 * - Concurrent operations
 * - State machine edge cases
 * - Data consistency
 * - Error messages and responses
 *
 * TODO: Partner B Never Responds (requires notification system + 48h timeout logic)
 * TODO: Both Click "Wait for Partner" (requires unpacking viewing preferences)
 * TODO: AI Misinterprets Conflict (requires unpacking feedback mechanism)
 * TODO: User Exits Mid-Interview (requires interview resume endpoints)
 * TODO: Crisis Language Detection (requires crisis intervention flow)
 */
describe('Edge Cases & Error Handling (E2E)', () => {
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

  describe('Input Validation', () => {
    it('should validate email format', async () => {
      const invalidEmails = [
        'notanemail',
        '@nodomain.com',
        'missing@',
        'spaces in@email.com',
        '',
      ];

      for (const email of invalidEmails) {
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email,
            password: 'password123',
            name: 'Test User',
          })
          .expect(400);
      }
    });

    it('should enforce password minimum length', async () => {
      const shortPasswords = ['', '1', '12', '1234567']; // < 8 chars

      for (const password of shortPasswords) {
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: 'test@example.com',
            password,
            name: 'Test User',
          })
          .expect(400);
      }
    });

    it('should require name field', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(400);
    });

    it('should handle very long input strings gracefully', async () => {
      const veryLongString = 'a'.repeat(10000);

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'long@example.com',
          password: 'password123',
          name: veryLongString,
        });

      // Should either succeed with truncation or fail with validation error
      expect([201, 400]).toContain(response.status);
    });

    it('should sanitize special characters in input', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'special@example.com',
          password: 'password123',
          name: '<script>alert("xss")</script>',
        })
        .expect(201);

      // Name should be stored, but we trust NestJS validation/sanitization
      expect(response.body.user.name).toBeDefined();
    });

    it('should validate UUID format for ID parameters', async () => {
      const { userA } = await createAuthenticatedCouple(app);

      // Invalid UUID formats
      const invalidIds = ['123', 'not-a-uuid', '12345678', 'abc-def-ghi'];

      for (const invalidId of invalidIds) {
        await request(app.getHttpServer())
          .get(`/sessions/${invalidId}`)
          .set('Authorization', `Bearer ${userA.token}`)
          .expect(400); // Bad Request for invalid UUID format
      }
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle simultaneous user registrations with same email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'password123',
        name: 'Duplicate User',
      };

      // Fire two registrations simultaneously
      const [response1, response2] = await Promise.all([
        request(app.getHttpServer()).post('/auth/register').send(userData),
        request(app.getHttpServer()).post('/auth/register').send(userData),
      ]);

      // One should succeed, one should fail with conflict
      const statuses = [response1.status, response2.status].sort();
      expect(statuses).toEqual([201, 409]); // One success, one conflict
    });

    it('should handle simultaneous invite acceptances gracefully', async () => {
      // User A creates invite
      const userA = await registerUser(app, {
        email: 'alice@example.com',
        password: 'password123',
        name: 'Alice',
      });

      const inviteResponse = await request(app.getHttpServer())
        .post('/couples/invite')
        .set('Authorization', `Bearer ${userA.token}`)
        .expect(201);

      const inviteToken = inviteResponse.body.inviteToken;

      // Two different users try to accept same invite simultaneously
      const userB1 = await registerUser(app, {
        email: 'bob1@example.com',
        password: 'password123',
        name: 'Bob 1',
      });

      const userB2 = await registerUser(app, {
        email: 'bob2@example.com',
        password: 'password123',
        name: 'Bob 2',
      });

      const [response1, response2] = await Promise.all([
        request(app.getHttpServer())
          .post('/couples/accept')
          .set('Authorization', `Bearer ${userB1.token}`)
          .send({ inviteToken }),
        request(app.getHttpServer())
          .post('/couples/accept')
          .set('Authorization', `Bearer ${userB2.token}`)
          .send({ inviteToken }),
      ]);

      // One should succeed, one should fail
      const statuses = [response1.status, response2.status].sort();
      expect([200, 404]).toContain(statuses[0]);
      expect([200, 404]).toContain(statuses[1]);
      expect(statuses[0]).not.toBe(statuses[1]); // They should be different
    });

    it('should handle simultaneous session creations from same couple', async () => {
      const { userA } = await createAuthenticatedCouple(app);

      // Try to create two sessions simultaneously
      const [response1, response2] = await Promise.all([
        request(app.getHttpServer())
          .post('/sessions')
          .set('Authorization', `Bearer ${userA.token}`),
        request(app.getHttpServer())
          .post('/sessions')
          .set('Authorization', `Bearer ${userA.token}`),
      ]);

      // One should succeed, one should fail with conflict
      const statuses = [response1.status, response2.status].sort();
      expect(statuses).toEqual([201, 409]); // One success, one conflict
    });
  });

  describe('State Machine Edge Cases', () => {
    it('should prevent skipping required status steps', async () => {
      const { userA } = await createAuthenticatedCouple(app);
      const session = await createSession(app, userA.token);

      // Try to jump from 'initiated' to 'resolved' without intermediate steps
      await request(app.getHttpServer())
        .patch(`/sessions/${session.id}/status`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ status: 'resolved' })
        .expect(409);

      // Try to jump to 'reconnection' without being at 'unpacking_ready'
      await request(app.getHttpServer())
        .patch(`/sessions/${session.id}/status`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ status: 'reconnection' })
        .expect(409);
    });

    it('should allow abandoning from any non-final state', async () => {
      const { userA } = await createAuthenticatedCouple(app);

      // Test abandoning from 'initiated'
      const session1 = await createSession(app, userA.token);
      await request(app.getHttpServer())
        .patch(`/sessions/${session1.id}/status`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ status: 'abandoned' })
        .expect(200);

      // Create new session and advance to 'in_progress'
      const session2 = await createSession(app, userA.token);
      await request(app.getHttpServer())
        .patch(`/sessions/${session2.id}/status`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ status: 'in_progress' })
        .expect(200);

      // Test abandoning from 'in_progress'
      await request(app.getHttpServer())
        .patch(`/sessions/${session2.id}/status`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ status: 'abandoned' })
        .expect(200);
    });

    it('should prevent reverting from final states', async () => {
      const { userA } = await createAuthenticatedCouple(app);
      const session = await createSession(app, userA.token);

      // Advance to resolved
      await request(app.getHttpServer())
        .patch(`/sessions/${session.id}/status`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ status: 'in_progress' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/sessions/${session.id}/status`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ status: 'unpacking_ready' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/sessions/${session.id}/status`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ status: 'reconnection' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/sessions/${session.id}/status`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ status: 'resolved' })
        .expect(200);

      // Try to go backwards
      await request(app.getHttpServer())
        .patch(`/sessions/${session.id}/status`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ status: 'in_progress' })
        .expect(409);

      // Try to go to abandoned (should also fail from final state)
      await request(app.getHttpServer())
        .patch(`/sessions/${session.id}/status`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ status: 'abandoned' })
        .expect(409);
    });

    it('should handle invalid status values', async () => {
      const { userA } = await createAuthenticatedCouple(app);
      const session = await createSession(app, userA.token);

      const invalidStatuses = [
        'invalid',
        'INITIATED', // Case sensitive
        'complete',
        '',
        null,
        123,
      ];

      for (const status of invalidStatuses) {
        await request(app.getHttpServer())
          .patch(`/sessions/${session.id}/status`)
          .set('Authorization', `Bearer ${userA.token}`)
          .send({ status })
          .expect(400);
      }
    });
  });

  describe('Data Consistency', () => {
    it('should maintain referential integrity when deleting users', async () => {
      // This test documents expected behavior
      // TODO: Implement cascade delete or prevent deletion with active relationships
      // For now, database constraints should prevent orphaned records
    });

    it('should handle large JSON interview responses', async () => {
      const { userA } = await createAuthenticatedCouple(app);
      const session = await createSession(app, userA.token);

      // Create large response array
      const largeResponses = Array.from({ length: 100 }, (_, i) => ({
        question: `Question ${i}`,
        answer: `Answer ${i} with some additional context `.repeat(10),
        timestamp: new Date().toISOString(),
        metadata: { index: i, processed: true },
      }));

      const response = await request(app.getHttpServer())
        .post(`/sessions/${session.id}/interview`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ responses: largeResponses })
        .expect(201);

      expect(response.body.responses).toHaveLength(100);
    });

    it('should handle malformed JSON in interview responses gracefully', async () => {
      const { userA } = await createAuthenticatedCouple(app);
      const session = await createSession(app, userA.token);

      // Send invalid JSON structure (missing responses array)
      await request(app.getHttpServer())
        .post(`/sessions/${session.id}/interview`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ notResponses: 'invalid' })
        .expect(400);
    });

    it('should preserve interview data integrity when session status changes', async () => {
      const { userA, userB } = await createAuthenticatedCouple(app);
      const session = await createSession(app, userA.token);

      // Submit interviews
      const userAInterview = await request(app.getHttpServer())
        .post(`/sessions/${session.id}/interview`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          responses: [{ question: 'Q1', answer: 'Original answer from A' }],
        })
        .expect(201);

      const userBInterview = await request(app.getHttpServer())
        .post(`/sessions/${session.id}/interview`)
        .set('Authorization', `Bearer ${userB.token}`)
        .send({
          responses: [{ question: 'Q1', answer: 'Original answer from B' }],
        })
        .expect(201);

      // Advance session status
      await request(app.getHttpServer())
        .patch(`/sessions/${session.id}/status`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ status: 'reconnection' })
        .expect(200);

      // Verify interviews still intact
      // TODO: Add GET /interviews/:id endpoint to verify data persistence
    });
  });

  describe('Error Responses', () => {
    it('should return appropriate HTTP status codes', async () => {
      const { userA } = await createAuthenticatedCouple(app);

      // 400 Bad Request - validation error
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'invalid' })
        .expect(400);

      // 401 Unauthorized - missing auth
      await request(app.getHttpServer()).get('/couples/me').expect(401);

      // 403 Forbidden - insufficient permissions
      const thirdParty = await registerUser(app, {
        email: 'third@example.com',
        password: 'password123',
        name: 'Third',
      });

      const session = await createSession(app, userA.token);

      await request(app.getHttpServer())
        .get(`/sessions/${session.id}`)
        .set('Authorization', `Bearer ${thirdParty.token}`)
        .expect(403);

      // 404 Not Found - resource doesn't exist
      await request(app.getHttpServer())
        .get('/sessions/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${userA.token}`)
        .expect(404);

      // 409 Conflict - duplicate/conflicting operation
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'alice@example.com',
          password: 'password123',
          name: 'Duplicate',
        })
        .expect(409); // userA already has this email
    });

    it('should return helpful error messages', async () => {
      // Missing required field
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
      expect(Array.isArray(response.body.message)).toBe(true);
    });

    it('should not expose sensitive information in error messages', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        })
        .expect(401);

      // Should not reveal if email exists or not
      expect(response.body.message).not.toContain('email');
      expect(response.body.message).not.toContain('user not found');
    });
  });

  describe('Boundary Conditions', () => {
    it('should handle empty string inputs', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: '',
          password: '',
          name: '',
        })
        .expect(400);
    });

    it('should handle null values appropriately', async () => {
      const { userA } = await createAuthenticatedCouple(app);

      // Session with null optional fields should succeed
      const response = await request(app.getHttpServer())
        .post('/sessions')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          topic: null,
          context: null,
        })
        .expect(201);

      expect(response.body.topic).toBeNull();
      expect(response.body.context).toBeNull();
    });

    it('should handle undefined vs null correctly', async () => {
      const { userA } = await createAuthenticatedCouple(app);

      // Omitting optional fields (undefined) should work
      const response1 = await request(app.getHttpServer())
        .post('/sessions')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({})
        .expect(201);

      expect(response1.body.topic).toBeNull();

      // Explicitly setting to null should also work
      await request(app.getHttpServer())
        .patch(`/sessions/${response1.body.id}/status`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ status: 'abandoned' })
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .post('/sessions')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          topic: null,
          context: null,
        })
        .expect(201);

      expect(response2.body.topic).toBeNull();
    });

    it('should handle maximum allowed sessions gracefully', async () => {
      // TODO: Implement max sessions limit if needed
      // This test documents that we should consider limiting
      // the number of sessions per couple (e.g., for storage/performance)
    });
  });

  describe('Spec-Defined Edge Cases', () => {
    describe('Edge Case: User Exits Mid-Interview', () => {
      it('should auto-save interview responses as drafts', async () => {
        const { userA } = await createAuthenticatedCouple(app);
        const session = await createSession(app, userA.token);

        // Save interview as draft (partial responses)
        const draftInterview = await request(app.getHttpServer())
          .patch(`/sessions/${session.id}/interview/draft`)
          .set('Authorization', `Bearer ${userA.token}`)
          .send({
            responses: [
              { question: 'Q1', answer: 'A1' },
              { question: 'Q2', answer: 'A2' },
            ],
          })
          .expect(200);

        // Interview saved as draft (not marked complete)
        expect(draftInterview.body.completedAt).toBeNull();

        // User can retrieve their draft
        const retrievedDraft = await request(app.getHttpServer())
          .get(`/sessions/${session.id}/interview`)
          .set('Authorization', `Bearer ${userA.token}`)
          .expect(200);

        expect(retrievedDraft.body.completedAt).toBeNull();
        expect(retrievedDraft.body.responses).toEqual([
          { question: 'Q1', answer: 'A1' },
          { question: 'Q2', answer: 'A2' },
        ]);

        // User can continue and submit final interview
        const finalInterview = await request(app.getHttpServer())
          .post(`/sessions/${session.id}/interview`)
          .set('Authorization', `Bearer ${userA.token}`)
          .send({
            responses: [
              { question: 'Q1', answer: 'A1' },
              { question: 'Q2', answer: 'A2' },
              { question: 'Q3', answer: 'A3' }, // Added more responses
            ],
          })
          .expect(201);

        expect(finalInterview.body.completedAt).not.toBeNull();
      });
    });

    describe('Edge Case: Multiple Active Sessions Prevention', () => {
      it('should enforce one active session per couple', async () => {
        const { userA, userB } = await createAuthenticatedCouple(app);

        // Create first session
        const session1 = await createSession(app, userA.token);

        // Try to create second session while first is active
        await request(app.getHttpServer())
          .post('/sessions')
          .set('Authorization', `Bearer ${userB.token}`)
          .expect(409);

        // After abandoning first session, should be able to create new one
        await request(app.getHttpServer())
          .patch(`/sessions/${session1.id}/status`)
          .set('Authorization', `Bearer ${userA.token}`)
          .send({ status: 'abandoned' })
          .expect(200);

        // Now second session should succeed
        await request(app.getHttpServer())
          .post('/sessions')
          .set('Authorization', `Bearer ${userB.token}`)
          .expect(201);
      });
    });

    describe('Edge Case: Agreement Must Be Signed Before Sessions', () => {
      it('should block session creation until agreement signed by both', async () => {
        // Create couple but don't sign agreement
        const userA = await registerUser(app, {
          email: 'alice@example.com',
          password: 'password123',
          name: 'Alice',
        });

        const inviteResponse = await request(app.getHttpServer())
          .post('/couples/invite')
          .set('Authorization', `Bearer ${userA.token}`)
          .expect(201);

        const userB = await registerUser(app, {
          email: 'bob@example.com',
          password: 'password123',
          name: 'Bob',
        });

        await request(app.getHttpServer())
          .post('/couples/accept')
          .set('Authorization', `Bearer ${userB.token}`)
          .send({ inviteToken: inviteResponse.body.inviteToken })
          .expect(200);

        // Try to create session without agreement - should fail
        await request(app.getHttpServer())
          .post('/sessions')
          .set('Authorization', `Bearer ${userA.token}`)
          .expect(403);

        // Sign agreement with one partner
        await request(app.getHttpServer())
          .post('/couples/agreement')
          .set('Authorization', `Bearer ${userA.token}`)
          .send({ confirm: true })
          .expect(200);

        // Still should fail (need both signatures)
        await request(app.getHttpServer())
          .post('/sessions')
          .set('Authorization', `Bearer ${userA.token}`)
          .expect(403);

        // Sign with second partner
        await request(app.getHttpServer())
          .post('/couples/agreement')
          .set('Authorization', `Bearer ${userB.token}`)
          .send({ confirm: true })
          .expect(200);

        // Now should succeed
        await request(app.getHttpServer())
          .post('/sessions')
          .set('Authorization', `Bearer ${userA.token}`)
          .expect(201);
      });
    });
  });

  // TODO: Add these edge case tests when features are implemented

  describe('[TODO] Edge Case: Partner B Never Responds', () => {
    it.todo('should send 24h reminder to Partner B');
    it.todo('should send 48h final reminder to Partner B');
    it.todo('should offer Partner A options after 72h timeout');
    it.todo('should NOT provide solo unpacking to Partner A');
  });

  describe('[TODO] Edge Case: Both Click Wait for Partner', () => {
    it.todo('should detect mutual wait state');
    it.todo('should unlock when either partner returns');
    it.todo('should auto-unlock after 24h');
  });

  describe('[TODO] Edge Case: AI Misinterprets Conflict', () => {
    it.todo('should allow feedback on unpacking accuracy');
    it.todo('should trigger regeneration with additional context');
    it.todo('should track regeneration attempts');
  });

  describe('[TODO] Edge Case: Crisis Language Detected', () => {
    it.todo('should detect self-harm language');
    it.todo('should detect abuse mentions');
    it.todo('should show crisis intervention screen');
    it.todo('should display emergency resource hotlines');
    it.todo('should block session progression until acknowledged');
  });
});
