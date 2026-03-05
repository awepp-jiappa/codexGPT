import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { getUserFromSession } from '@/app/lib/auth';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getUserFromSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = Number(params.id);
  await prisma.conversation.deleteMany({ where: { id, userId: user.id } });

  return NextResponse.json({ ok: true });
}
