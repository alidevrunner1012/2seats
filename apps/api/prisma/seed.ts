import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed(): Promise<void> {
  const user = await prisma.user.upsert({
    where: { email: 'hello@2seats.local' },
    update: {},
    create: {
      email: 'hello@2seats.local',
      displayName: 'Movie Night',
    },
  });

  await prisma.room.upsert({
    where: { inviteCode: 'cozy-night' },
    update: {},
    create: {
      inviteCode: 'cozy-night',
      name: 'A Cozy Night In',
      createdById: user.id,
      members: {
        create: {
          userId: user.id,
          role: 'HOST',
        },
      },
    },
  });
}

seed()
  .catch((error: unknown) => {
    console.error('Database seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
