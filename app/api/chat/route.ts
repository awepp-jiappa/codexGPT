import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { ensureStartupEvent, prisma } from '@/app/lib/db';
import { getUserFromSession } from '@/app/lib/auth';
import { verifyCsrfToken } from '@/app/lib/csrf';
import { chatSchema } from '@/app/lib/validation';
import { getOpenAIClient } from '@/app/lib/openai';
import { checkRateLimit, endStream, tryStartStream } from '@/app/lib/rate-limit';
import { logError, logInfo } from '@/app/lib/log';
import { makeConversationTitle, truncateMessagesForContext } from '@/app/lib/security';
import { createSystemEvent } from '@/app/lib/system-events';
import { incrementTotalErrors, incrementTotalRequests } from '@/app/lib/metrics';
import { recordUsageEvent } from '@/app/lib/usage';
import { maybeRunDailyCleanup } from '@/app/lib/maintenance';

const HEARTBEAT_MS = 15_000;
const OPENAI_TIMEOUT_MS = 120_000;

export async function POST(req: Request) {
  await ensureStartupEvent();
  await maybeRunDailyCleanup();
  incrementTotalRequests();

  const requestId = randomUUID();
  const startMs = Date.now();

  if (!(await verifyCsrfToken(req))) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });

  const user = await getUserFromSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!checkRateLimit(user.id)) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  if (!tryStartStream(user.id)) return NextResponse.json({ error: 'Too many concurrent streams' }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) {
    endStream(user.id);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  let conversationId = parsed.data.conversationId;
  let shouldAutotitle = false;

  if (!conversationId) {
    const conv = await prisma.conversation.create({
      data: { userId: user.id, title: makeConversationTitle(parsed.data.message) }
    });
    conversationId = conv.id;
  } else {
    const ownsConversation = await prisma.conversation.findFirst({ where: { id: conversationId, userId: user.id } });
    if (!ownsConversation) {
      endStream(user.id);
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const messageCount = await prisma.message.count({ where: { conversationId } });
    shouldAutotitle = messageCount === 0;
  }

  if (parsed.data.regenerate) {
    const lastAssistant = await prisma.message.findFirst({ where: { conversationId, role: 'assistant' }, orderBy: { createdAt: 'desc' } });
    if (lastAssistant) await prisma.message.delete({ where: { id: lastAssistant.id } });
  }

  if (!parsed.data.regenerate) {
    await prisma.message.create({ data: { conversationId, role: 'user', content: parsed.data.message } });
    if (shouldAutotitle) {
      await prisma.conversation.update({ where: { id: conversationId }, data: { title: makeConversationTitle(parsed.data.message) } });
    }
  }

  const [priorMessages, settings] = await Promise.all([
    prisma.message.findMany({ where: { conversationId }, orderBy: { createdAt: 'asc' } }),
    prisma.userSettings.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} })
  ]);

  const preparedMessages = truncateMessagesForContext([
    ...(settings.systemPrompt ? [{ role: 'system' as const, content: settings.systemPrompt }] : []),
    ...priorMessages.map((m: (typeof priorMessages)[number]) => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content }))
  ]);

  const encoder = new TextEncoder();
  let assistantText = '';
  let heartbeatTimer: NodeJS.Timeout | null = null;
  let promptTokens: number | null = null;
  let completionTokens: number | null = null;
  let totalTokens: number | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      heartbeatTimer = setInterval(() => {
        controller.enqueue(encoder.encode(`event: chunk\ndata: ${JSON.stringify({ text: '' })}\n\n`));
      }, HEARTBEAT_MS);

      controller.enqueue(encoder.encode(`event: chunk\ndata: ${JSON.stringify({ text: '', conversationId, requestId })}\n\n`));

      try {
        const completion = await getOpenAIClient().chat.completions.create(
          {
            model: settings.model,
            temperature: settings.temperature,
            stream: true,
            stream_options: { include_usage: true },
            messages: preparedMessages
          },
          { timeout: OPENAI_TIMEOUT_MS }
        );

        for await (const chunk of completion) {
          if (chunk.usage) {
            promptTokens = chunk.usage.prompt_tokens ?? null;
            completionTokens = chunk.usage.completion_tokens ?? null;
            totalTokens = chunk.usage.total_tokens ?? null;
          }

          const token = chunk.choices[0]?.delta?.content ?? '';
          if (!token) continue;
          assistantText += token;
          controller.enqueue(encoder.encode(`event: chunk\ndata: ${JSON.stringify({ text: token })}\n\n`));
        }

        await prisma.message.create({ data: { conversationId, role: 'assistant', content: assistantText } });
        controller.enqueue(encoder.encode('event: done\ndata: {}\n\n'));
        logInfo('chat.complete', { requestId, userId: user.id, durationMs: Date.now() - startMs, messageLength: assistantText.length });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected error';
        controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message })}\n\n`));
        incrementTotalErrors();
        await createSystemEvent('error', 'openai.request_error', { requestId, userId: user.id, message });
        logError('chat.error', { requestId, userId: user.id, durationMs: Date.now() - startMs, message });
      } finally {
        await recordUsageEvent({
          userId: user.id,
          conversationId,
          model: settings.model,
          requestId,
          usage: { promptTokens, completionTokens, totalTokens }
        }).catch(() => {});

        if (heartbeatTimer) clearInterval(heartbeatTimer);
        endStream(user.id);
        controller.close();
      }
    },
    async cancel() {
      if (assistantText) {
        await prisma.message.create({ data: { conversationId, role: 'assistant', content: `${assistantText}\n\n(stopped)` } });
      }
      await recordUsageEvent({
        userId: user.id,
        conversationId,
        model: settings.model,
        requestId,
        usage: { promptTokens, completionTokens, totalTokens }
      }).catch(() => {});
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      endStream(user.id);
      logInfo('chat.cancelled', { requestId, userId: user.id, durationMs: Date.now() - startMs });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Request-Id': requestId
    }
  });
}
