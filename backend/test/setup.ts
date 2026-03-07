import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

/**
 * Setup test database before running E2E tests
 * This runs migrations on a test database
 */
export async function setupTestDatabase() {
  // Ensure we're using the test database
  if (!process.env.DATABASE_URL?.includes('test')) {
    throw new Error(
      'DATABASE_URL must point to a test database (should contain "test" in the name)',
    );
  }

  try {
    // Run migrations on test database
    execSync('npx prisma migrate deploy', {
      env: process.env,
      stdio: 'inherit',
    });

    console.log('✓ Test database setup complete');
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }
}

/**
 * Clean up test database after tests
 */
export async function cleanupTestDatabase() {
  const cleanupPrisma = new PrismaClient();
  try {
    // Delete all data in reverse order of dependencies
    await cleanupPrisma.unpacking.deleteMany();
    await cleanupPrisma.interview.deleteMany();
    await cleanupPrisma.session.deleteMany();
    await cleanupPrisma.couple.deleteMany();
    await cleanupPrisma.user.deleteMany();

    console.log('✓ Test database cleaned up');
  } catch (error) {
    console.error('Failed to cleanup test database:', error);
    throw error;
  } finally {
    await cleanupPrisma.$disconnect();
  }
}

/**
 * Reset test database between test suites
 */
export async function resetTestDatabase() {
  await cleanupTestDatabase();
}
