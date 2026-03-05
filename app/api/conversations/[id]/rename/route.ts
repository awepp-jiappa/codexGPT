import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { getUserFromSession, verifyCsrfToken } from '@/app/lib/auth';
import { titleSchema } from '@/app/lib/validation';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!(await verifyCsrfToken(req))) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
  const user = await getUserFromSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = titleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid title' }, { status: 400 });

  const conversation = await prisma.conversation.updateMany({
    where: { id: Number(params.id), userId: user.id },
    data: { title: parsed.data.title }
  });

  return NextResponse.json({ updated: conversation.count });
}
