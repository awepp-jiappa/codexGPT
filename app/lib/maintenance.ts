import { env } from '@/app/lib/env';
import { prisma } from '@/app/lib/db';
import { createSystemEvent } from '@/app/lib/system-events';
import { setLastCleanupTime } from '@/app/lib/metrics';

const globalMaintenance = globalThis as unknown as { __lastDailyCleanupRun?: string };

export function getRetentionCutoff(now: Date, retentionDays: number) {
  return new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
}

export async function runRetentionCleanup(now = new Date()) {
  const deleted: Record<string, number> = {};

  if (env.RETENTION_DAYS_MESSAGES > 0) {
    const result = await prisma.message.deleteMany({
      where: { createdAt: { lt: getRetentionCutoff(now, env.RETENTION_DAYS_MESSAGES) } }
    });
    deleted.messages = result.count;
  }

  if (env.RETENTION_DAYS_USAGE > 0) {
    const result = await prisma.usageEvent.deleteMany({
      where: { createdAt: { lt: getRetentionCutoff(now, env.RETENTION_DAYS_USAGE) } }
    });
    deleted.usage_events = result.count;
  }

  const runAt = now.toISOString();
  setLastCleanupTime(runAt);
  await createSystemEvent('info', 'maintenance.cleanup', { runAt, deleted, retention: { messages: env.RETENTION_DAYS_MESSAGES, usage: env.RETENTION_DAYS_USAGE } });

  return { runAt, deleted };
}

export async function maybeRunDailyCleanup(now = new Date()) {
  if (process.env.NEXT_PHASE === "phase-production-build") return null;
  const dayKey = now.toISOString().slice(0, 10);
  if (globalMaintenance.__lastDailyCleanupRun === dayKey) return null;
  globalMaintenance.__lastDailyCleanupRun = dayKey;
  return runRetentionCleanup(now);
}
