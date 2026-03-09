import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { requireAdmin } from '@/app/lib/auth';
import { verifyCsrfToken } from '@/app/lib/csrf';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!(await verifyCsrfToken(req))) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });

  const id = Number(params.id);
  const body = await req.json().catch(() => ({}));
  const isDisabled = Boolean(body.isDisabled);

  if (admin.id === id && isDisabled) {
    return NextResponse.json({ error: 'Cannot disable your own account' }, { status: 400 });
  }

  const user = await prisma.user.update({ where: { id }, data: { isDisabled } });
  if (isDisabled) {
    await prisma.session.deleteMany({ where: { userId: id } });
  }

  return NextResponse.json({ user });
}
