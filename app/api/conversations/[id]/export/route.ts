import { NextResponse } from 'next/server';
import { getUserFromSession } from '@/app/lib/auth';
import { prisma } from '@/app/lib/db';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const user = await getUserFromSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const conversation = await prisma.conversation.findUnique({
    where: { id: Number(params.id) },
    include: { messages: { orderBy: { createdAt: 'asc' } } }
  });

  if (!conversation) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!user.isAdmin && conversation.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  return NextResponse.json({
    title: conversation.title,
    exportedAt: new Date().toISOString(),
    sourceConversationId: conversation.id,
    messages: conversation.messages.map((message) => ({ role: message.role, content: message.content, createdAt: message.createdAt.toISOString() }))
  });
}
