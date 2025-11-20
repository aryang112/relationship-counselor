import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Add seed data here when needed
  // Example:
  // const user = await prisma.user.create({
  //   data: {
  //     email: 'admin@example.com',
  //     password: 'hashed-password',
  //     name: 'Admin User',
  //     timezone: 'UTC',
  //   },
  // });

  console.log('✅ Seed completed');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
