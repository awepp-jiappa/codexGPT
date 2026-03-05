import { prisma } from '@/app/lib/db';
import { issueCsrfToken, requireAdmin } from '@/app/lib/auth';
import { env } from '@/app/lib/env';
import { AdminUsers } from '@/app/components/admin-users';

export default async function AdminPage() {
  await requireAdmin();
  const csrfToken = issueCsrfToken();
  const [users, errorEvents, usageRows] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.systemEvent.findMany({ where: { level: 'error' }, orderBy: { createdAt: 'desc' }, take: 50 }),
    prisma.dailyUsageRollup.findMany({ orderBy: { date: 'desc' }, include: { user: { select: { username: true } } }, take: 100 })
  ]);

  let dbOk = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbOk = false;
  }

  return (
    <AdminUsers
      initialUsers={users.map((u: (typeof users)[number]) => ({ id: u.id, username: u.username, isAdmin: u.isAdmin, isDisabled: u.isDisabled }))}
      initialUsageRows={usageRows.map((row) => ({
        userId: row.userId,
        username: row.user.username,
        date: row.date,
        totalRequests: row.totalRequests,
        totalTokens: row.totalTokens,
        estimatedCostUsd: row.estimatedCostUsd
      }))}
      errorEvents={errorEvents.map((event) => ({ id: event.id, createdAt: event.createdAt.toISOString(), message: event.message, metaJson: event.metaJson }))}
      appVersion={env.BUILD_VERSION}
      dbOk={dbOk}
      csrfToken={csrfToken}
    />
  );
}
