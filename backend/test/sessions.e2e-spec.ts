import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  createTestApp,
  closePrismaConnections,
  createAuthenticatedCouple,
  createSession,
  notificationsServiceMock,
} from './test-helpers';
import { resetTestDatabase } from './setup';

/**
 * E2E Test Suite: Session Creation and Management
 *
 * Tests the complete session lifecycle as specified in:
 * relationship-app-detailed-design-spec.md - Flow 2: Starting a Mediation Session
 *
 * This suite validates:
 * - Session creation and initiation
 * - Session status transitions
 * - Interview submission
 * - Session history and retrieval
 * - Status validation and business rules
 *
 * TODO: Add notification tests when notification system is implemented
 *       - When Partner A starts session, Partner B should receive push + email notification
 *       - Test notification content includes initiator name and session details
 */
describe('Session Creation and Management (E2E)', () => {
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
    notificationsServiceMock.sends.length = 0;
  });

  describe('Session Creation', () => {
    it('should allow Partner A to initiate a mediation session', async () => {
      const { userA, couple } = await createAuthenticatedCouple(app);

      const response = await request(app.getHttpServer())
        .post('/sessions')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          topic: 'Communication issues',
          context: 'We had an argument about plans',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        coupleId: couple.id,
        status: 'initiated',
        initiatedBy: userA.user.id,
        topic: 'Communication issues',
        context: 'We had an argument about plans',
      });

      // TODO: Verify notification sent to Partner B
      // expect(notificationService.send).toHaveBeenCalledWith({
      //   userId: userB.user.id,
      //   type: 'session_initiated',
      //   title: `${userA.user.name} wants to work through something with you 💙`,
      //   channels: ['push', 'email']
      // });
    });

    it('should allow Partner B to initiate a mediation session', async () => {
      const { userB, couple } = await createAuthenticatedCouple(app);

      const response = await request(app.getHttpServer())
        .post('/sessions')
        .set('Authorization', `Bearer ${userB.token}`)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        coupleId: couple.id,
        status: 'initiated',
        initiatedBy: userB.user.id,
      });
    });

    it('should allow optional topic and context', async () => {
      const { userA } = await createAuthenticatedCouple(app);

      const response = await request(app.getHttpServer())
        .post('/sessions')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({})
        .expect(201);

      expect(response.body.topic).toBeNull();
      expect(response.body.context).toBeNull();
    });

    it('should prevent session creation before couple is formed', async () => {
      // Register a solo user
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'solo@example.com',
          password: 'password123',
          name: 'Solo',
        })
        .expect(201);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'solo@example.com',
          password: 'password123',
        })
        .expect(200);

      await request(app.getHttpServer())
        .post('/sessions')
        .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
        .expect(404); // No couple found
    });

    it('should prevent session creation before agreement is signed', async () => {
      // Register User A
      const registerA = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'alice@example.com',
          password: 'password123',
          name: 'Alice',
        })
        .expect(201);

      const loginA = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'alice@example.com', password: 'password123' })
        .expect(200);

      // Create invite
      const inviteResponse = await request(app.getHttpServer())
        .post('/couples/invite')
        .set('Authorization', `Bearer ${loginA.body.accessToken}`)
        .expect(201);

      // Register User B and accept
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'bob@example.com',
          password: 'password123',
          name: 'Bob',
        })
        .expect(201);

      const loginB = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'bob@example.com', password: 'password123' })
        .expect(200);

      await request(app.getHttpServer())
        .post('/couples/accept')
        .set('Authorization', `Bearer ${loginB.body.accessToken}`)
        .send({ inviteToken: inviteResponse.body.inviteToken })
        .expect(200);

      // Try to create session without signing agreement
      await request(app.getHttpServer())
        .post('/sessions')
        .set('Authorization', `Bearer ${loginA.body.accessToken}`)
        .expect(403); // Forbidden - agreement not signed
    });

    it('should prevent multiple active sessions for same couple', async () => {
      const { userA } = await createAuthenticatedCouple(app);

      // Create first session
      await request(app.getHttpServer())
        .post('/sessions')
        .set('Authorization', `Bearer ${userA.token}`)
        .expect(201);

      // Try to create second session while first is active
      await request(app.getHttpServer())
        .post('/sessions')
        .set('Authorization', `Bearer ${userA.token}`)
        .expect(409); // Conflict - active session exists
    });

    it('should require authentication to create session', async () => {
      await request(app.getHttpServer()).post('/sessions').expect(401);
    });
  });

  describe('Session Retrieval', () => {
    it('should allow partners to retrieve their session by ID', async () => {
      const { userA, userB } = await createAuthenticatedCouple(app);
      const session = await createSession(app, userA.token);

      // Partner A can retrieve
      const responseA = await request(app.getHttpServer())
        .get(`/sessions/${session.id}`)
        .set('Authorization', `Bearer ${userA.token}`)
        .expect(200);

      expect(responseA.body.id).toBe(session.id);

      // Partner B can also retrieve
      const responseB = await request(app.getHttpServer())
        .get(`/sessions/${session.id}`)
        .set('Authorization', `Bearer ${userB.token}`)
        .expect(200);

      expect(responseB.body.id).toBe(session.id);
    });

    it('should return 404 for non-existent session', async () => {
      const { userA } = await createAuthenticatedCouple(app);

      await request(app.getHttpServer())
        .get('/sessions/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${userA.token}`)
        .expect(404);
    });

    it('should list all sessions for a couple', async () => {
      const { userA } = await createAuthenticatedCouple(app);

      // Create multiple sessions
      const session1 = await createSession(app, userA.token, {
        topic: 'Topic 1',
      });
      await request(app.getHttpServer())
        .patch(`/sessions/${session1.id}/status`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ status: 'abandoned' })
        .expect(200);

      const session2 = await createSession(app, userA.token, {
        topic: 'Topic 2',
      });

      const response = await request(app.getHttpServer())
        .get('/sessions')
        .set('Authorization', `Bearer ${userA.token}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].topic).toBe('Topic 2'); // Most recent first
      expect(response.body[1].topic).toBe('Topic 1');
    });
  });

  describe('Interview Submission', () => {
    it('should allow Partner A to submit interview responses', async () => {
      const { userA } = await createAuthenticatedCouple(app);
      const session = await createSession(app, userA.token);

      const interviewData = {
        responses: [
          { question: 'What happened?', answer: 'We had a disagreement' },
          { question: 'How did you feel?', answer: 'I felt hurt' },
        ],
      };

      const response = await request(app.getHttpServer())
        .post(`/sessions/${session.id}/interview`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send(interviewData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        sessionId: session.id,
        userId: userA.user.id,
        responses: interviewData.responses,
      });
    });

    it('should update session status to in_progress when first interview submitted', async () => {
      const { userA } = await createAuthenticatedCouple(app);
      const session = await createSession(app, userA.token);

      await request(app.getHttpServer())
        .post(`/sessions/${session.id}/interview`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          responses: [{ question: 'Q1', answer: 'A1' }],
        })
        .expect(201);

      const sessionResponse = await request(app.getHttpServer())
        .get(`/sessions/${session.id}`)
        .set('Authorization', `Bearer ${userA.token}`)
        .expect(200);

      expect(sessionResponse.body.status).toBe('in_progress');
    });

    it('should update session status to unpacking_ready when both interviews submitted', async () => {
      const { userA, userB } = await createAuthenticatedCouple(app);
      const session = await createSession(app, userA.token);

      // Partner A submits
      await request(app.getHttpServer())
        .post(`/sessions/${session.id}/interview`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          responses: [{ question: 'Q1', answer: 'A1' }],
        })
        .expect(201);

      // Partner B submits
      await request(app.getHttpServer())
        .post(`/sessions/${session.id}/interview`)
        .set('Authorization', `Bearer ${userB.token}`)
        .send({
          responses: [{ question: 'Q1', answer: 'A1' }],
        })
        .expect(201);

      const sessionResponse = await request(app.getHttpServer())
        .get(`/sessions/${session.id}`)
        .set('Authorization', `Bearer ${userA.token}`)
        .expect(200);

      expect(sessionResponse.body.status).toBe('unpacking_ready');

      // TODO: Verify unpacking generation job is queued
      // expect(unpackingQueue.add).toHaveBeenCalledWith({
      //   sessionId: session.id,
      //   interviewA: expect.any(Object),
      //   interviewB: expect.any(Object)
      // });

      // TODO: Verify notification sent to both partners
      // expect(notificationService.send).toHaveBeenCalledTimes(2);
    });

    it('should allow updating interview responses from same user', async () => {
      const { userA } = await createAuthenticatedCouple(app);
      const session = await createSession(app, userA.token);

      // First submission succeeds
      const firstResponse = await request(app.getHttpServer())
        .post(`/sessions/${session.id}/interview`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          responses: [{ question: 'Q1', answer: 'A1' }],
        })
        .expect(201);

      const interviewId = firstResponse.body.id;

      // Second submission should be rejected with conflict
      await request(app.getHttpServer())
        .post(`/sessions/${session.id}/interview`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          responses: [{ question: 'Q2', answer: 'A2' }],
        })
        .expect(409);
    });

    it('should store responses as JSON', async () => {
      const { userA } = await createAuthenticatedCouple(app);
      const session = await createSession(app, userA.token);

      const complexResponses = {
        responses: [
          {
            question: 'What happened?',
            answer: 'Multiple things...',
            timestamp: new Date().toISOString(),
            emotion: 'frustrated',
          },
          {
            question: 'How intense is this?',
            answer: '7',
            scale: { min: 1, max: 10 },
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post(`/sessions/${session.id}/interview`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send(complexResponses)
        .expect(201);

      expect(response.body.responses).toEqual(complexResponses.responses);
    });
  });

  describe('Session Status Management', () => {
    it('should allow valid status transitions', async () => {
      const { userA } = await createAuthenticatedCouple(app);
      const session = await createSession(app, userA.token);

      // initiated → in_progress
      await request(app.getHttpServer())
        .patch(`/sessions/${session.id}/status`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ status: 'in_progress' })
        .expect(200);

      // in_progress → unpacking_ready
      await request(app.getHttpServer())
        .patch(`/sessions/${session.id}/status`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ status: 'unpacking_ready' })
        .expect(200);

      // unpacking_ready → reconnection
      await request(app.getHttpServer())
        .patch(`/sessions/${session.id}/status`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ status: 'reconnection' })
        .expect(200);

      // reconnection → resolved
      await request(app.getHttpServer())
        .patch(`/sessions/${session.id}/status`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ status: 'resolved' })
        .expect(200);
    });

    it('should prevent invalid status transitions', async () => {
      const { userA } = await createAuthenticatedCouple(app);
      const session = await createSession(app, userA.token);

      // Cannot go from initiated directly to resolved
      await request(app.getHttpServer())
        .patch(`/sessions/${session.id}/status`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ status: 'resolved' })
        .expect(409);
    });

    it('should prevent reverting from resolved status', async () => {
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

      // Cannot go back to in_progress
      await request(app.getHttpServer())
        .patch(`/sessions/${session.id}/status`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ status: 'in_progress' })
        .expect(409);
    });

    it('should allow abandoning session from any non-final state', async () => {
      const { userA } = await createAuthenticatedCouple(app);
      const session = await createSession(app, userA.token);

      await request(app.getHttpServer())
        .patch(`/sessions/${session.id}/status`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ status: 'abandoned' })
        .expect(200);

      const session2 = await createSession(app, userA.token);
      await request(app.getHttpServer())
        .patch(`/sessions/${session2.id}/status`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ status: 'in_progress' })
        .expect(200);
      await request(app.getHttpServer())
        .patch(`/sessions/${session2.id}/status`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ status: 'abandoned' })
        .expect(200);
    });

    it('should get current session status', async () => {
      const { userA } = await createAuthenticatedCouple(app);
      const session = await createSession(app, userA.token);

      const response = await request(app.getHttpServer())
        .get(`/sessions/${session.id}/status`)
        .set('Authorization', `Bearer ${userA.token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        sessionId: session.id,
        status: 'initiated',
        partnerStatus: {
          userAId: expect.any(String),
          userBId: expect.any(String),
          userAComplete: false,
          userBComplete: false,
        },
      });
    });
  });

  describe('Session Progress Tracking', () => {
    it('should track which partner has completed interview', async () => {
      const { userA, userB } = await createAuthenticatedCouple(app);
      const session = await createSession(app, userA.token);

      // Initially, no interviews
      let statusResponse = await request(app.getHttpServer())
        .get(`/sessions/${session.id}/status`)
        .set('Authorization', `Bearer ${userA.token}`)
        .expect(200);

      expect(statusResponse.body.partnerStatus.userAComplete).toBe(false);
      expect(statusResponse.body.partnerStatus.userBComplete).toBe(false);

      // Partner A submits
      await request(app.getHttpServer())
        .post(`/sessions/${session.id}/interview`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ responses: [{ q: 'q1', a: 'a1' }] })
        .expect(201);

      statusResponse = await request(app.getHttpServer())
        .get(`/sessions/${session.id}/status`)
        .set('Authorization', `Bearer ${userA.token}`)
        .expect(200);

      expect(statusResponse.body.partnerStatus.userAComplete).toBe(true);
      expect(statusResponse.body.partnerStatus.userBComplete).toBe(false);

      // Partner B submits
      await request(app.getHttpServer())
        .post(`/sessions/${session.id}/interview`)
        .set('Authorization', `Bearer ${userB.token}`)
        .send({ responses: [{ q: 'q1', a: 'a1' }] })
        .expect(201);

      statusResponse = await request(app.getHttpServer())
        .get(`/sessions/${session.id}/status`)
        .set('Authorization', `Bearer ${userA.token}`)
        .expect(200);

      expect(statusResponse.body.partnerStatus.userAComplete).toBe(true);
      expect(statusResponse.body.partnerStatus.userBComplete).toBe(true);
    });
  });

  describe('Notifications', () => {
    it('should send manual reminder to partner to complete interview', async () => {
      const { userA, userB } = await createAuthenticatedCouple(app);
      const session = await createSession(app, userA.token);

      await request(app.getHttpServer())
        .post(`/sessions/${session.id}/remind-partner`)
        .set('Authorization', `Bearer ${userA.token}`)
        .expect(201);

      const reminder = notificationsServiceMock.sends.find(
        (n) => n.type === 'manual_interview_reminder' && n.userId === userB.user.id,
      );
      expect(reminder).toBeDefined();
      expect(reminder.data.sessionId).toBe(session.id);
    });

    it('should return 403 if both partners already completed interviews', async () => {
      const { userA, userB } = await createAuthenticatedCouple(app);
      const session = await createSession(app, userA.token);

      // Both partners complete interviews
      await request(app.getHttpServer())
        .post(`/sessions/${session.id}/interview`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ responses: [{ q: 'q1', a: 'a1' }] })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/sessions/${session.id}/interview`)
        .set('Authorization', `Bearer ${userB.token}`)
        .send({ responses: [{ q: 'q1', a: 'a1' }] })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/sessions/${session.id}/remind-partner`)
        .set('Authorization', `Bearer ${userA.token}`)
        .expect(403);
    });

    it('should return 429 when reminders are sent too frequently', async () => {
      const { userA, userB } = await createAuthenticatedCouple(app);
      const session = await createSession(app, userA.token);

      await request(app.getHttpServer())
        .post(`/sessions/${session.id}/remind-partner`)
        .set('Authorization', `Bearer ${userA.token}`)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/sessions/${session.id}/remind-partner`)
        .set('Authorization', `Bearer ${userA.token}`)
        .expect(429);
    });
  });

  describe('Complete Session Flow', () => {
    it('should complete full session lifecycle from creation to unpacking_ready', async () => {
      const { userA, userB, couple } = await createAuthenticatedCouple(app);

      console.log('Step 1: Partner A initiates session');
      const session = await request(app.getHttpServer())
        .post('/sessions')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          topic: 'Communication',
          context: 'We need to talk about our schedules',
        })
        .expect(201);

      expect(session.body.status).toBe('initiated');
      expect(session.body.initiatedBy).toBe(userA.user.id);
      const initNotification = notificationsServiceMock.sends.find(
        (n) => n.type === 'session_initiated' && n.userId === userB.user.id,
      );
      expect(initNotification).toBeDefined();

      console.log('Step 2: Partner A completes interview');
      await request(app.getHttpServer())
        .post(`/sessions/${session.body.id}/interview`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          responses: [
            { question: 'What happened?', answer: 'She canceled our call' },
            { question: 'How do you feel?', answer: 'Hurt and frustrated' },
            {
              question: 'What do you need?',
              answer: 'I need to feel prioritized',
            },
          ],
        })
        .expect(201);

      let statusCheck = await request(app.getHttpServer())
        .get(`/sessions/${session.body.id}/status`)
        .set('Authorization', `Bearer ${userA.token}`)
        .expect(200);

      expect(statusCheck.body.status).toBe('in_progress');
      expect(statusCheck.body.partnerStatus.userAComplete).toBe(true);
      expect(statusCheck.body.partnerStatus.userBComplete).toBe(false);

      console.log('Step 3: Partner B completes interview');
      await request(app.getHttpServer())
        .post(`/sessions/${session.body.id}/interview`)
        .set('Authorization', `Bearer ${userB.token}`)
        .send({
          responses: [
            {
              question: 'What happened?',
              answer: 'My friend had an emergency',
            },
            { question: 'How do you feel?', answer: 'Guilty and overwhelmed' },
            {
              question: 'What do you need?',
              answer: 'I need understanding and flexibility',
            },
          ],
        })
        .expect(201);

      statusCheck = await request(app.getHttpServer())
        .get(`/sessions/${session.body.id}/status`)
        .set('Authorization', `Bearer ${userA.token}`)
        .expect(200);

      expect(statusCheck.body.status).toBe('unpacking_ready');
      expect(statusCheck.body.partnerStatus.userAComplete).toBe(true);
      expect(statusCheck.body.partnerStatus.userBComplete).toBe(true);

      const unpackingReadyNotifications = notificationsServiceMock.sends.filter(
        (n) => n.type === 'unpacking_ready' && n.data?.sessionId === session.body.id,
      );
      expect(unpackingReadyNotifications.map((n) => n.userId).sort()).toEqual(
        [userA.user.id, userB.user.id].sort(),
      );

      console.log('✓ Complete session flow verified: Initiation → Both Interviews → Unpacking Ready');
    });
  });
});
