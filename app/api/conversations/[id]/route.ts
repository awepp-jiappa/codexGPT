import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { getUserFromSession, verifyCsrfToken } from '@/app/lib/auth';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  if (!(await verifyCsrfToken(req))) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
  const user = await getUserFromSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = Number(params.id);
  await prisma.conversation.deleteMany({ where: { id, userId: user.id } });

  return NextResponse.json({ ok: true });
}
