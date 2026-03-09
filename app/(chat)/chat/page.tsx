import { prisma } from '@/app/lib/db';
import { requireUser } from '@/app/lib/auth';
import { issueCsrfToken } from '@/app/lib/csrf';
import { ChatShell } from '@/app/components/chat-shell';

export default async function ChatPage() {
  const user = await requireUser();
  const csrfToken = issueCsrfToken();
  const conversations = await prisma.conversation.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    include: { messages: { orderBy: { createdAt: 'asc' } } }
  });

  const simplified = conversations.map((c: (typeof conversations)[number]) => ({
    id: c.id,
    title: c.title,
    messages: c.messages.map((m: (typeof c.messages)[number]) => ({ id: m.id, role: m.role as 'user' | 'assistant' | 'system', content: m.content }))
  }));

  return <ChatShell initialConversations={simplified} username={user.username} isAdmin={user.isAdmin} csrfToken={csrfToken} />;
}
