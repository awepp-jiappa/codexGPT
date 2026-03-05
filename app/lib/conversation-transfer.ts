export type TransferMessage = { role: 'user' | 'assistant' | 'system'; content: string; createdAt?: string };

const VALID_ROLES = new Set(['user', 'assistant', 'system']);

export function sanitizeImportedConversation(payload: unknown): { title: string; messages: TransferMessage[] } | null {
  if (!payload || typeof payload !== 'object') return null;
  const raw = payload as { title?: unknown; messages?: unknown };
  const title = typeof raw.title === 'string' && raw.title.trim().length > 0 ? raw.title.trim().slice(0, 120) : 'Imported Chat';
  if (!Array.isArray(raw.messages)) return null;

  const messages: TransferMessage[] = [];
  for (const msg of raw.messages) {
    if (!msg || typeof msg !== 'object') continue;
    const item = msg as { role?: unknown; content?: unknown; createdAt?: unknown };
    if (typeof item.role !== 'string' || !VALID_ROLES.has(item.role)) continue;
    if (typeof item.content !== 'string' || item.content.trim().length === 0) continue;
    messages.push({
      role: item.role as TransferMessage['role'],
      content: item.content.slice(0, 8000),
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : undefined
    });
  }

  if (messages.length === 0) return null;
  return { title, messages };
}
