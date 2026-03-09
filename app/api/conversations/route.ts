import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { getUserFromSession } from '@/app/lib/auth';
import { verifyCsrfToken } from '@/app/lib/csrf';
import { titleSchema } from '@/app/lib/validation';

export async function GET() {
  const user = await getUserFromSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const conversations = await prisma.conversation.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    include: { messages: { orderBy: { createdAt: 'asc' } } }
  });

  return NextResponse.json({ conversations });
}

export async function POST(req: Request) {
  if (!(await verifyCsrfToken(req))) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
  const user = await getUserFromSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const json = await req.json().catch(() => ({}));
  const parsed = titleSchema.safeParse({ title: json.title ?? 'New Chat' });
  if (!parsed.success) return NextResponse.json({ error: 'Invalid title' }, { status: 400 });

  const conversation = await prisma.conversation.create({
    data: { userId: user.id, title: parsed.data.title }
  });

  return NextResponse.json({ conversation });
}
