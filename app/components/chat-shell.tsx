'use client';

import { FormEvent, useMemo, useState } from 'react';

type Message = { id: number; role: 'user' | 'assistant' | 'system'; content: string };
type Conversation = { id: number; title: string; messages: Message[] };

export function ChatShell({ initialConversations, username }: { initialConversations: Conversation[]; username: string }) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState<number | null>(initialConversations[0]?.id ?? null);
  const [draft, setDraft] = useState('');
  const [streaming, setStreaming] = useState(false);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [activeId, conversations]
  );

  async function createConversation() {
    const response = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New Chat' })
    });
    const data = await response.json();
    setConversations((prev) => [{ ...data.conversation, messages: [] }, ...prev]);
    setActiveId(data.conversation.id);
    return data.conversation.id as number;
  }

  async function renameConversation(id: number) {
    const title = window.prompt('Rename conversation');
    if (!title) return;
    await fetch(`/api/conversations/${id}/rename`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    });
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  }

  async function deleteConversation(id: number) {
    await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim() || streaming) return;

    const messageText = draft;
    setDraft('');
    setStreaming(true);

    let tempConversationId = activeId;
    if (!tempConversationId) {
      tempConversationId = await createConversation();
    }

    const userMessage: Message = { id: Date.now(), role: 'user', content: messageText };
    setConversations((prev) =>
      prev.map((c) => (c.id === tempConversationId ? { ...c, messages: [...c.messages, userMessage] } : c))
    );

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: tempConversationId ?? undefined, message: messageText })
    });

    if (!response.body) {
      setStreaming(false);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let assistant = '';
    const assistantTempId = Date.now() + 2;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';

      for (const eventBlock of events) {
        const lines = eventBlock.split('\n');
        const event = lines.find((line) => line.startsWith('event:'))?.slice(6).trim();
        const dataText = lines.find((line) => line.startsWith('data:'))?.slice(5).trim() ?? '{}';
        const data = JSON.parse(dataText);

        if (event === 'meta' && data.conversationId) {
          setActiveId(data.conversationId);
          tempConversationId = data.conversationId;
          setConversations((prev) => {
            if (prev.some((c) => c.id === data.conversationId)) return prev;
            return [{ id: data.conversationId, title: messageText.slice(0, 60), messages: [userMessage] }, ...prev];
          });
        }

        if (event === 'token') {
          assistant += data.token;
          const assistantMessage: Message = { id: assistantTempId, role: 'assistant', content: assistant };
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== tempConversationId) return c;
              const msgs = c.messages.filter((m) => !(m.role === 'assistant' && m.id === assistantMessage.id));
              return { ...c, messages: [...msgs, assistantMessage] };
            })
          );
        }
      }
    }

    setStreaming(false);
  }

  return (
    <div className="flex h-screen">
      <aside className="w-80 border-r border-zinc-800 bg-zinc-900 p-3">
        <div className="mb-3 flex items-center justify-between">
          <button onClick={createConversation} className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium">New Chat</button>
          <form action="/api/auth/logout" method="post"><button className="text-sm text-zinc-300">Logout</button></form>
        </div>
        <p className="mb-2 text-xs text-zinc-500">Signed in as {username}</p>
        <div className="space-y-2 overflow-y-auto">
          {conversations.map((conversation) => (
            <div key={conversation.id} className={`rounded-md border p-2 ${conversation.id === activeId ? 'border-emerald-500 bg-zinc-800' : 'border-zinc-800 bg-zinc-950'}`}>
              <button onClick={() => setActiveId(conversation.id)} className="w-full text-left text-sm">{conversation.title}</button>
              <div className="mt-2 flex gap-2 text-xs text-zinc-400">
                <button onClick={() => renameConversation(conversation.id)}>Rename</button>
                <button onClick={() => deleteConversation(conversation.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main className="flex flex-1 flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {activeConversation?.messages.map((message) => (
            <div key={message.id} className={`max-w-3xl rounded-xl p-4 ${message.role === 'user' ? 'ml-auto bg-emerald-700/50' : 'bg-zinc-800'}`}>
              <p className="whitespace-pre-wrap text-sm">{message.content}</p>
            </div>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="border-t border-zinc-800 p-4">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSubmit(e as unknown as FormEvent);
              }
            }}
            className="h-28 w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3"
            placeholder="Send a message..."
          />
          <button disabled={streaming} className="mt-2 rounded-md bg-emerald-600 px-4 py-2 disabled:opacity-50">{streaming ? 'Streaming…' : 'Send'}</button>
        </form>
      </main>
    </div>
  );
}
