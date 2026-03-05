'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

type Message = { id: number; role: 'user' | 'assistant' | 'system'; content: string };
type Conversation = { id: number; title: string; messages: Message[] };
type Settings = { model: string; temperature: number; systemPrompt: string };

function MarkdownMessage({ content }: { content: string }) {
  const blocks = content.split('```');
  return (
    <div className="space-y-2 text-sm">
      {blocks.map((block, index) => {
        if (index % 2 === 1) {
          return (
            <pre key={index} className="relative overflow-auto rounded bg-zinc-950 p-3">
              <button onClick={() => navigator.clipboard.writeText(block)} className="absolute right-2 top-2 text-xs text-zinc-400">Copy</button>
              <code>{block}</code>
            </pre>
          );
        }
        return block.split('\n').map((line, lineIndex) => {
          const withLinks = line.replace(/\[(.*?)\]\((https?:\/\/[^\s]+)\)/g, '$1 <$2>');
          const withInlineCode = withLinks.replace(/`([^`]+)`/g, '[$1]');
          return <p key={`${index}-${lineIndex}`} className="whitespace-pre-wrap">{withInlineCode}</p>;
        });
      })}
    </div>
  );
}

export function ChatShell({ initialConversations, username, isAdmin, csrfToken }: { initialConversations: Conversation[]; username: string; isAdmin: boolean; csrfToken: string }) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState<number | null>(initialConversations[0]?.id ?? null);
  const [draft, setDraft] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [search, setSearch] = useState('');
  const [settings, setSettings] = useState<Settings>({ model: 'gpt-4o-mini', temperature: 0.7, systemPrompt: '' });
  const controllerRef = useRef<AbortController | null>(null);

  const activeConversation = useMemo(() => conversations.find((c) => c.id === activeId) ?? null, [activeId, conversations]);
  const filteredConversations = useMemo(
    () => conversations.filter((c) => `${c.title} ${c.messages.at(-1)?.content ?? ''}`.toLowerCase().includes(search.toLowerCase())),
    [conversations, search]
  );

  useEffect(() => {
    void fetch('/api/settings').then((res) => res.json()).then((data) => {
      if (data.settings) setSettings({ model: data.settings.model, temperature: data.settings.temperature, systemPrompt: data.settings.systemPrompt });
    }).catch(() => null);
  }, []);

  async function createConversation() {
    const response = await fetch('/api/conversations', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken }, body: JSON.stringify({ title: 'New Chat' })
    });
    const data = await response.json();
    setConversations((prev) => [{ ...data.conversation, messages: [] }, ...prev]);
    setActiveId(data.conversation.id);
    return data.conversation.id as number;
  }

  async function saveSettings(next: Settings) {
    setSettings(next);
    await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken }, body: JSON.stringify(next) });
  }

  async function handleSubmit(event: FormEvent, regenerate = false) {
    event.preventDefault();
    if ((!draft.trim() && !regenerate) || streaming) return;

    const messageText = regenerate ? (activeConversation?.messages.filter((m) => m.role === 'user').at(-1)?.content ?? '') : draft;
    if (!regenerate) setDraft('');
    setStreaming(true);

    let tempConversationId = activeId;
    if (!tempConversationId) tempConversationId = await createConversation();

    const userMessage: Message = { id: Date.now(), role: 'user', content: messageText };
    if (!regenerate) {
      setConversations((prev) => prev.map((c) => (c.id === tempConversationId ? { ...c, messages: [...c.messages, userMessage] } : c)));
    }

    controllerRef.current = new AbortController();
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
      body: JSON.stringify({ conversationId: tempConversationId ?? undefined, message: messageText, regenerate }),
      signal: controllerRef.current.signal
    }).catch(() => null);

    if (!response?.body) {
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
        if (event !== 'chunk') continue;

        assistant += data.text ?? '';
        const assistantMessage: Message = { id: assistantTempId, role: 'assistant', content: assistant };
        setConversations((prev) => prev.map((c) => c.id !== tempConversationId ? c : { ...c, messages: [...c.messages.filter((m) => m.id !== assistantTempId), assistantMessage] }));
      }
    }

    setStreaming(false);
    controllerRef.current = null;
  }

  return (
    <div className="flex h-screen">
      <aside className="w-80 border-r border-zinc-800 bg-zinc-900 p-3">
        <div className="mb-3 flex items-center justify-between">
          <button onClick={createConversation} className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium">New Chat</button>
          <form action="/api/auth/logout" method="post"><input type="hidden" name="csrfToken" value={csrfToken} /><button className="text-sm text-zinc-300">Logout</button></form>
        </div>
        {isAdmin && <Link href="/admin" className="mb-2 block text-xs text-emerald-300">Admin users</Link>}
        <p className="mb-2 text-xs text-zinc-500">Signed in as {username}</p>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search conversations" className="mb-2 w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm" />
        <div className="space-y-2 overflow-y-auto">
          {filteredConversations.map((conversation) => (
            <div key={conversation.id} className={`rounded-md border p-2 ${conversation.id === activeId ? 'border-emerald-500 bg-zinc-800' : 'border-zinc-800 bg-zinc-950'}`}>
              <button onClick={() => setActiveId(conversation.id)} className="w-full text-left text-sm">{conversation.title}</button>
            </div>
          ))}
        </div>
      </aside>

      <main className="flex flex-1 flex-col">
        <div className="border-b border-zinc-800 p-3 text-xs text-zinc-400">
          <div className="flex gap-2">
            <input value={settings.model} onChange={(e) => saveSettings({ ...settings, model: e.target.value })} className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1" />
            <input type="number" min="0" max="1" step="0.1" value={settings.temperature} onChange={(e) => saveSettings({ ...settings, temperature: Number(e.target.value) })} className="w-20 rounded border border-zinc-700 bg-zinc-900 px-2 py-1" />
          </div>
          <textarea value={settings.systemPrompt} onChange={(e) => saveSettings({ ...settings, systemPrompt: e.target.value })} placeholder="System prompt" className="mt-2 w-full rounded border border-zinc-700 bg-zinc-900 p-2" />
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {activeConversation?.messages.map((message) => (
            <div key={message.id} className={`max-w-3xl rounded-xl p-4 ${message.role === 'user' ? 'ml-auto bg-emerald-700/50' : 'bg-zinc-800'}`}>
              <MarkdownMessage content={message.content} />
            </div>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="border-t border-zinc-800 p-4">
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="h-28 w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3" placeholder="Send a message..." />
          <div className="mt-2 flex gap-2">
            <button disabled={streaming} className="rounded-md bg-emerald-600 px-4 py-2 disabled:opacity-50">{streaming ? 'Streaming…' : 'Send'}</button>
            <button type="button" disabled={!streaming} onClick={() => controllerRef.current?.abort()} className="rounded-md bg-zinc-700 px-4 py-2 disabled:opacity-50">Stop generating</button>
            <button type="button" onClick={(e) => void handleSubmit(e as unknown as FormEvent, true)} className="rounded-md bg-zinc-700 px-4 py-2">Regenerate response</button>
          </div>
        </form>
      </main>
    </div>
  );
}
