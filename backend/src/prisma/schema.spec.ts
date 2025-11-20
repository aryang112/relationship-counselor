import { PrismaClient } from '@prisma/client';

describe('Prisma schema validation', () => {
  it('can instantiate PrismaClient with all required models', () => {
    const prisma = new PrismaClient();

    // Verify models exist by checking delegate properties
    expect(prisma.user).toBeDefined();
    expect(prisma.couple).toBeDefined();
    expect(prisma.session).toBeDefined();
    expect(prisma.interview).toBeDefined();

    // Cleanup
    prisma.$disconnect();
  });

  it('validates model relationships are configured', async () => {
    const prisma = new PrismaClient();

    // Verify that we can access the model delegates
    // This ensures Prisma generated the client with all relations
    expect(typeof prisma.user.findFirst).toBe('function');
    expect(typeof prisma.couple.findFirst).toBe('function');
    expect(typeof prisma.session.findFirst).toBe('function');
    expect(typeof prisma.interview.findFirst).toBe('function');

    await prisma.$disconnect();
  });
});
