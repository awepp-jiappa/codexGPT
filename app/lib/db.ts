import { PrismaClient } from '@prisma/client';
import { env } from '@/app/lib/env';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; __startupLogged?: boolean };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export async function ensureStartupEvent() {
  if (globalForPrisma.__startupLogged) return;
  globalForPrisma.__startupLogged = true;

  const missing = ['OPENAI_API_KEY', 'AUTH_SECRET', 'APP_URL', 'DATABASE_URL'].filter((key) => !process.env[key]);
  if (missing.length > 0) {
    await prisma.systemEvent.create({ data: { level: 'error', message: 'config.validation_error', metaJson: JSON.stringify({ missing }) } }).catch(() => {});
  }

  await prisma.systemEvent
    .create({
      data: {
        level: 'info',
        message: 'app.startup',
        metaJson: JSON.stringify({ buildVersion: env.BUILD_VERSION, nodeEnv: process.env.NODE_ENV ?? 'development' })
      }
    })
    .catch(() => {});
}
