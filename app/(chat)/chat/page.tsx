import { prisma } from '@/app/lib/db';
import { requireUser } from '@/app/lib/auth';
import { ChatShell } from '@/app/components/chat-shell';

export default async function ChatPage() {
  const user = await requireUser();
  const conversations = await prisma.conversation.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    include: { messages: { orderBy: { createdAt: 'asc' } } }
  });

  const simplified = conversations.map((c) => ({
    id: c.id,
    title: c.title,
    messages: c.messages.map((m) => ({ id: m.id, role: m.role, content: m.content }))
  }));

  return <ChatShell initialConversations={simplified} username={user.username} />;
}
