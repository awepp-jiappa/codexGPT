import { prisma } from '@/app/lib/db';
import { issueCsrfToken, requireAdmin } from '@/app/lib/auth';
import { AdminUsers } from '@/app/components/admin-users';

export default async function AdminPage() {
  await requireAdmin();
  const csrfToken = issueCsrfToken();
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
  return <AdminUsers initialUsers={users.map((u: (typeof users)[number]) => ({ id: u.id, username: u.username, isAdmin: u.isAdmin, isDisabled: u.isDisabled }))} csrfToken={csrfToken} />;
}
