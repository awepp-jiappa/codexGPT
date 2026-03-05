import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { getUserFromSession } from '@/app/lib/auth';
import { chatSchema } from '@/app/lib/validation';
import { openai } from '@/app/lib/openai';
import { checkRateLimit } from '@/app/lib/rate-limit';

export async function POST(req: Request) {
  const user = await getUserFromSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!checkRateLimit(user.id)) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  let conversationId = parsed.data.conversationId;

  if (!conversationId) {
    const conv = await prisma.conversation.create({
      data: { userId: user.id, title: parsed.data.message.slice(0, 60) || 'New Chat' }
    });
    conversationId = conv.id;
  } else {
    const ownsConversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId: user.id }
    });
    if (!ownsConversation) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  await prisma.message.create({
    data: { conversationId, role: 'user', content: parsed.data.message }
  });

  const priorMessages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' }
  });

  const encoder = new TextEncoder();
  let assistantText = '';

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`event: meta\ndata: ${JSON.stringify({ conversationId })}\n\n`));
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          stream: true,
          messages: priorMessages.map((m) => ({ role: m.role, content: m.content }))
        });

        for await (const chunk of completion) {
          const token = chunk.choices[0]?.delta?.content ?? '';
          if (!token) continue;
          assistantText += token;
          controller.enqueue(encoder.encode(`event: token\ndata: ${JSON.stringify({ token })}\n\n`));
        }

        await prisma.message.create({
          data: { conversationId, role: 'assistant', content: assistantText }
        });
        controller.enqueue(encoder.encode('event: done\ndata: {}\n\n'));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected error';
        controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message })}\n\n`));
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    }
  });
}
