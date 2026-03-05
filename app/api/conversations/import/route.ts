import { NextResponse } from 'next/server';
import { getUserFromSession, verifyCsrfToken } from '@/app/lib/auth';
import { prisma } from '@/app/lib/db';
import { sanitizeImportedConversation } from '@/app/lib/conversation-transfer';

export async function POST(req: Request) {
  if (!(await verifyCsrfToken(req))) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
  const user = await getUserFromSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = await req.json().catch(() => null);
  const sanitized = sanitizeImportedConversation(payload);
  if (!sanitized) return NextResponse.json({ error: 'Invalid import payload' }, { status: 400 });

  const conversation = await prisma.conversation.create({
    data: {
      userId: user.id,
      title: sanitized.title,
      messages: {
        create: sanitized.messages.map((message) => ({ role: message.role, content: message.content }))
      }
    },
    include: { messages: { orderBy: { createdAt: 'asc' } } }
  });

  return NextResponse.json({ conversation });
}
