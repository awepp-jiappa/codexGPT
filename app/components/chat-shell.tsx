'use client';

import Link from 'next/link';
import { FormEvent, KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';

type Message = { id: number | string; role: 'user' | 'assistant' | 'system'; content: string };
type Conversation = { id: number; title: string; messages: Message[] };
type Settings = { model: string; temperature: number; systemPrompt: string };

type ParsedInline = { type: 'text'; value: string } | { type: 'code'; value: string } | { type: 'link'; label: string; href: string };

function parseInline(text: string): ParsedInline[] {
  const result: ParsedInline[] = [];
  let index = 0;

  while (index < text.length) {
    const inlineCodeStart = text.indexOf('`', index);
    const linkStart = text.indexOf('[', index);
    const starts = [inlineCodeStart, linkStart].filter((value) => value !== -1);
    const next = starts.length > 0 ? Math.min(...starts) : -1;

    if (next === -1) {
      result.push({ type: 'text', value: text.slice(index) });
      break;
    }

    if (next > index) {
      result.push({ type: 'text', value: text.slice(index, next) });
    }

    if (next === inlineCodeStart) {
      const end = text.indexOf('`', inlineCodeStart + 1);
      if (end === -1) {
        result.push({ type: 'text', value: text.slice(inlineCodeStart) });
        break;
      }
      result.push({ type: 'code', value: text.slice(inlineCodeStart + 1, end) });
      index = end + 1;
      continue;
    }

    const linkLabelEnd = text.indexOf(']', linkStart + 1);
    const hrefStart = text.indexOf('(', linkLabelEnd + 1);
    const hrefEnd = text.indexOf(')', hrefStart + 1);
    const isValidLink = linkLabelEnd !== -1 && hrefStart === linkLabelEnd + 1 && hrefEnd !== -1;

    if (!isValidLink) {
      result.push({ type: 'text', value: text.slice(linkStart, linkStart + 1) });
      index = linkStart + 1;
      continue;
    }

    const href = text.slice(hrefStart + 1, hrefEnd).trim();
    if (!/^https?:\/\//i.test(href)) {
      result.push({ type: 'text', value: text.slice(linkStart, hrefEnd + 1) });
      index = hrefEnd + 1;
      continue;
    }

    result.push({ type: 'link', label: text.slice(linkStart + 1, linkLabelEnd), href });
    index = hrefEnd + 1;
  }

  return result;
}

function renderInline(text: string, keyPrefix: string) {
  return parseInline(text).map((part, index) => {
    if (part.type === 'code') {
      return <code key={`${keyPrefix}-${index}`} className="rounded bg-zinc-700/80 px-1.5 py-0.5 text-[0.85em]">{part.value}</code>;
    }
    if (part.type === 'link') {
      return <a key={`${keyPrefix}-${index}`} href={part.href} target="_blank" rel="noreferrer" className="text-emerald-300 underline">{part.label || part.href}</a>;
    }
    return <span key={`${keyPrefix}-${index}`}>{part.value}</span>;
  });
}

function MarkdownMessage({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  const parts = content.split(/```/g);

  async function copyCode(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="space-y-2 text-sm leading-6">
      {parts.map((part, blockIndex) => {
        if (blockIndex % 2 === 1) {
          return (
            <pre key={`code-${blockIndex}`} className="relative overflow-auto rounded bg-zinc-950 p-3">
              <button onClick={() => void copyCode(part)} className="absolute right-2 top-2 rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300">
                {copied ? 'Copied' : 'Copy'}
              </button>
              <code>{part.replace(/^\w+\n/, '')}</code>
            </pre>
          );
        }

        const lines = part.split('\n');
        const blocks: Array<{ type: 'paragraph' | 'list'; lines: string[] }> = [];
        for (const line of lines) {
          const isList = /^\s*([-*]|\d+\.)\s+/.test(line);
          const current = blocks.at(-1);
          if (isList) {
            if (current?.type === 'list') current.lines.push(line);
            else blocks.push({ type: 'list', lines: [line] });
          } else if (line.trim().length === 0) {
            blocks.push({ type: 'paragraph', lines: [''] });
          } else {
            if (current?.type === 'paragraph' && current.lines[0] !== '') current.lines.push(line);
            else blocks.push({ type: 'paragraph', lines: [line] });
          }
        }

        return blocks.map((block, lineIndex) => {
          if (block.type === 'list') {
            return (
              <ul key={`list-${blockIndex}-${lineIndex}`} className="ml-5 list-disc space-y-1">
                {block.lines.map((line, itemIndex) => {
                  const text = line.replace(/^\s*([-*]|\d+\.)\s+/, '');
                  return <li key={`list-item-${itemIndex}`}>{renderInline(text, `l-${blockIndex}-${lineIndex}-${itemIndex}`)}</li>;
                })}
              </ul>
            );
          }
          if (block.lines[0] === '') return <div key={`sp-${blockIndex}-${lineIndex}`} className="h-2" />;
          return <p key={`p-${blockIndex}-${lineIndex}`} className="whitespace-pre-wrap">{renderInline(block.lines.join('\n'), `p-${blockIndex}-${lineIndex}`)}</p>;
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [assistantTyping, setAssistantTyping] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const streamContainerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const activeConversation = useMemo(() => conversations.find((c) => c.id === activeId) ?? null, [activeId, conversations]);
  const filteredConversations = useMemo(() => {
    const lower = search.toLowerCase();
    return conversations.filter((c) => {
      if (!lower) return true;
      const haystack = `${c.title} ${c.messages.map((m) => m.content).join(' ')}`.toLowerCase();
      return haystack.includes(lower);
    });
  }, [conversations, search]);

  useEffect(() => {
    setLoadingSettings(true);
    void fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) {
          setSettings({ model: data.settings.model, temperature: data.settings.temperature, systemPrompt: data.settings.systemPrompt });
        }
      })
      .catch(() => null)
      .finally(() => setLoadingSettings(false));
  }, []);

  useEffect(() => {
    streamContainerRef.current?.scrollTo({ top: streamContainerRef.current.scrollHeight, behavior: 'smooth' });
  }, [activeConversation?.messages.length, assistantTyping]);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown as unknown as EventListener);
    return () => window.removeEventListener('keydown', onKeyDown as unknown as EventListener);
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

    const messageText = regenerate ? (activeConversation?.messages.filter((m) => m.role === 'user').at(-1)?.content ?? '') : draft.trim();
    if (!messageText) return;

    if (!regenerate) setDraft('');
    setStreaming(true);
    setAssistantTyping(true);

    let conversationId = activeId;
    if (!conversationId) conversationId = await createConversation();

    if (!regenerate) {
      const userMessage: Message = { id: `u-${Date.now()}`, role: 'user', content: messageText };
      setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, messages: [...c.messages, userMessage] } : c)));
    } else {
      setConversations((prev) => prev.map((c) => {
        if (c.id !== conversationId) return c;
        const messages = [...c.messages];
        const lastAssistantIndex = [...messages].reverse().findIndex((m) => m.role === 'assistant');
        if (lastAssistantIndex !== -1) messages.splice(messages.length - 1 - lastAssistantIndex, 1);
        return { ...c, messages };
      }));
    }

    controllerRef.current = new AbortController();
    const assistantTempId = `a-${Date.now()}`;
    let assistant = '';

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
      body: JSON.stringify({ conversationId, message: messageText, regenerate }),
      signal: controllerRef.current.signal
    }).catch(() => null);

    if (!response?.body) {
      setStreaming(false);
      setAssistantTyping(false);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const eventBlock of events) {
          const lines = eventBlock.split('\n');
          const eventName = lines.find((line) => line.startsWith('event:'))?.slice(6).trim();
          const dataText = lines.find((line) => line.startsWith('data:'))?.slice(5).trim() ?? '{}';
          const data = JSON.parse(dataText);

          if (eventName === 'error') throw new Error(data.message ?? 'Streaming failed');
          if (eventName !== 'chunk') continue;
          if (!data.text) continue;

          assistant += data.text;
          const assistantMessage: Message = { id: assistantTempId, role: 'assistant', content: assistant };
          setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, messages: [...c.messages.filter((m) => m.id !== assistantTempId), assistantMessage] } : c)));
        }
      }
    } finally {
      if (assistant && controllerRef.current?.signal.aborted) {
        setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, messages: c.messages.map((m) => (m.id === assistantTempId ? { ...m, content: `${assistant}\n\n(stopped)` } : m)) } : c)));
      }
      controllerRef.current = null;
      setStreaming(false);
      setAssistantTyping(false);
    }
  }

  function onEditorKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit(event as unknown as FormEvent);
    }
    if (event.key === 'Escape' && streaming) {
      controllerRef.current?.abort();
    }
  }

  return (
    <div className="flex h-screen">
      <aside className="w-80 border-r border-zinc-800 bg-zinc-900 p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <button onClick={createConversation} className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium">New Chat</button>
          <button onClick={() => setSettingsOpen((prev) => !prev)} className="rounded-md border border-zinc-700 px-3 py-2 text-xs">Settings</button>
          <form action="/api/auth/logout" method="post"><input type="hidden" name="csrfToken" value={csrfToken} /><button className="text-sm text-zinc-300">Logout</button></form>
        </div>
        {isAdmin && <Link href="/admin" className="mb-2 block text-xs text-emerald-300">Admin users</Link>}
        <p className="mb-2 text-xs text-zinc-500">Signed in as {username}</p>
        <input ref={searchInputRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title or message…" className="mb-2 w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm" />
        <div className="space-y-2 overflow-y-auto">
          {filteredConversations.map((conversation) => (
            <div key={conversation.id} className={`rounded-md border p-2 ${conversation.id === activeId ? 'border-emerald-500 bg-zinc-800' : 'border-zinc-800 bg-zinc-950'}`}>
              <button onClick={() => setActiveId(conversation.id)} className="w-full text-left text-sm">{conversation.title}</button>
            </div>
          ))}
        </div>
      </aside>

      <main className="flex flex-1 flex-col">
        {settingsOpen && (
          <div className="border-b border-zinc-800 p-3 text-xs text-zinc-400">
            {loadingSettings ? <p>Loading settings…</p> : (
              <>
                <div className="mb-2">
                  <label className="mb-1 block">Model</label>
                  <select value={settings.model} onChange={(e) => void saveSettings({ ...settings, model: e.target.value })} className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm">
                    <option value="gpt-4o-mini">gpt-4o-mini</option>
                    <option value="gpt-4o">gpt-4o</option>
                  </select>
                </div>
                <div className="mb-2">
                  <label className="mb-1 block">Temperature ({settings.temperature.toFixed(1)})</label>
                  <input type="range" min="0" max="1" step="0.1" value={settings.temperature} onChange={(e) => void saveSettings({ ...settings, temperature: Number(e.target.value) })} className="w-52" />
                </div>
                <div>
                  <label className="mb-1 block">System prompt</label>
                  <textarea value={settings.systemPrompt} onChange={(e) => void saveSettings({ ...settings, systemPrompt: e.target.value })} placeholder="System prompt" className="w-full rounded border border-zinc-700 bg-zinc-900 p-2" />
                </div>
              </>
            )}
          </div>
        )}
        <div ref={streamContainerRef} className="flex-1 space-y-4 overflow-y-auto p-6">
          {activeConversation?.messages.map((message, index) => {
            const isLastAssistant = message.role === 'assistant' && index === activeConversation.messages.length - 1;
            return (
              <div key={message.id} className={`max-w-3xl rounded-xl p-4 ${message.role === 'user' ? 'ml-auto bg-emerald-700/50' : 'bg-zinc-800'}`}>
                <MarkdownMessage content={message.content} />
                {isLastAssistant && !streaming && (
                  <button type="button" onClick={(e) => void handleSubmit(e as unknown as FormEvent, true)} className="mt-3 text-xs text-zinc-300 underline">
                    Regenerate response
                  </button>
                )}
              </div>
            );
          })}
          {assistantTyping && (
            <div className="max-w-3xl rounded-xl bg-zinc-800 p-4 text-zinc-300">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-300 [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-300 [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-300" />
              </span>
            </div>
          )}
        </div>
        <form onSubmit={(event) => void handleSubmit(event)} className="border-t border-zinc-800 p-4">
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onEditorKeyDown} disabled={streaming} className="h-28 w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 disabled:opacity-60" placeholder="Send a message... (Enter to send, Shift+Enter for new line)" />
          <div className="mt-2 flex gap-2">
            <button disabled={streaming || !draft.trim()} className="rounded-md bg-emerald-600 px-4 py-2 disabled:opacity-50">{streaming ? 'Streaming…' : 'Send'}</button>
            <button type="button" disabled={!streaming} onClick={() => controllerRef.current?.abort()} className="rounded-md bg-zinc-700 px-4 py-2 disabled:opacity-50">Stop generating</button>
          </div>
        </form>
      </main>
    </div>
  );
}
