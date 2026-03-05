import { prisma } from '@/app/lib/db';

export type SystemLevel = 'info' | 'warn' | 'error';

export async function createSystemEvent(level: SystemLevel, message: string, meta?: Record<string, unknown>) {
  try {
    await prisma.systemEvent.create({
      data: {
        level,
        message,
        metaJson: meta ? JSON.stringify(meta) : null
      }
    });
  } catch {
    // Keep logging best-effort and never break request flow.
  }
}
