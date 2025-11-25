import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';
import * as request from 'supertest';

/**
 * Create a test application instance
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  // Apply same global pipes as main.ts
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();

  return app;
}

/**
 * Helper to register a user and return auth token
 */
export async function registerUser(
  app: INestApplication,
  userData: {
    email: string;
    password: string;
    name: string;
    timezone?: string;
  },
): Promise<{ user: any; token: string }> {
  const registerResponse = await request(app.getHttpServer())
    .post('/auth/register')
    .send(userData)
    .expect(201);

  // Auth service now returns { accessToken, user } directly from registration
  return {
    user: registerResponse.body.user,
    token: registerResponse.body.accessToken,
  };
}

/**
 * Helper to create an authenticated couple
 */
export async function createAuthenticatedCouple(
  app: INestApplication,
): Promise<{
  userA: { user: any; token: string };
  userB: { user: any; token: string };
  couple: any;
}> {
  // Register User A
  const userA = await registerUser(app, {
    email: 'alice@example.com',
    password: 'password123',
    name: 'Alice',
    timezone: 'America/New_York',
  });

  // User A creates invite
  const inviteResponse = await request(app.getHttpServer())
    .post('/couples/invite')
    .set('Authorization', `Bearer ${userA.token}`)
    .expect(201);

  const inviteToken = inviteResponse.body.inviteToken;

  // Register User B
  const userB = await registerUser(app, {
    email: 'bob@example.com',
    password: 'password123',
    name: 'Bob',
    timezone: 'America/Los_Angeles',
  });

  // User B accepts invite
  const coupleResponse = await request(app.getHttpServer())
    .post('/couples/accept')
    .set('Authorization', `Bearer ${userB.token}`)
    .send({ inviteToken })
    .expect(200);

  // Both users sign agreement
  await request(app.getHttpServer())
    .post('/couples/agreement')
    .set('Authorization', `Bearer ${userA.token}`)
    .send({ confirm: true })
    .expect(200);

  await request(app.getHttpServer())
    .post('/couples/agreement')
    .set('Authorization', `Bearer ${userB.token}`)
    .send({ confirm: true })
    .expect(200);

  return {
    userA,
    userB,
    couple: coupleResponse.body,
  };
}

/**
 * Helper to create a session for a couple
 */
export async function createSession(
  app: INestApplication,
  token: string,
  sessionData?: { topic?: string; context?: string },
): Promise<any> {
  const response = await request(app.getHttpServer())
    .post('/sessions')
    .set('Authorization', `Bearer ${token}`)
    .send(sessionData || {})
    .expect(201);

  return response.body;
}

/**
 * Clean up Prisma connections
 */
export async function closePrismaConnections(app: INestApplication) {
  const prisma = app.get(PrismaService);
  await prisma.$disconnect();
}
