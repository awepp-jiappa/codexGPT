import assert from 'node:assert/strict';
import test from 'node:test';

function getRetentionCutoff(now, retentionDays) {
  return new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
}

function sanitizeImportedConversation(payload) {
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.messages)) return null;
  const title = typeof payload.title === 'string' && payload.title.trim() ? payload.title.trim().slice(0, 120) : 'Imported Chat';
  const messages = payload.messages
    .map((m) => (m && ['user', 'assistant', 'system'].includes(m.role) && typeof m.content === 'string' && m.content.trim() ? { role: m.role, content: m.content.slice(0, 8000) } : null))
    .filter(Boolean);
  return messages.length ? { title, messages } : null;
}

function estimateCostUsd(model, usage) {
  const prices = {
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'gpt-4o': { input: 0.005, output: 0.015 }
  };
  const p = prices[model];
  if (!p || usage.promptTokens == null || usage.completionTokens == null) return null;
  return Number((((usage.promptTokens / 1000) * p.input) + ((usage.completionTokens / 1000) * p.output)).toFixed(8));
}

test('retention cutoff subtracts expected days', () => {
  const now = new Date('2026-01-10T00:00:00.000Z');
  assert.equal(getRetentionCutoff(now, 5).toISOString(), '2026-01-05T00:00:00.000Z');
});

test('export/import sanitization keeps valid messages', () => {
  const input = {
    title: ' roundtrip ',
    messages: [{ role: 'user', content: 'hello' }, { role: 'assistant', content: 'world' }, { role: 'evil', content: 'nope' }]
  };
  const sanitized = sanitizeImportedConversation(input);
  assert.equal(sanitized.title, 'roundtrip');
  assert.equal(sanitized.messages.length, 2);
});

test('usage estimation behaves best-effort', () => {
  assert.equal(estimateCostUsd('unknown', { promptTokens: 1, completionTokens: 1 }), null);
  assert.equal(estimateCostUsd('gpt-4o-mini', { promptTokens: null, completionTokens: 20 }), null);
  assert.equal(estimateCostUsd('gpt-4o-mini', { promptTokens: 1000, completionTokens: 1000 }), 0.00075);
});
