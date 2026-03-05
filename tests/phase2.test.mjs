import assert from 'node:assert/strict';
import test from 'node:test';

function evaluateSignupState(userCount, allowPublicSignupEnv) {
  const bootstrapMode = userCount === 0;
  return { userCount, bootstrapMode, allowPublicSignup: bootstrapMode || allowPublicSignupEnv };
}

function checkRateLimitFactory() {
  const userRequestLog = new Map();
  const WINDOW_MS = 60_000;
  const MAX_REQUESTS = 30;
  return (userId, now = Date.now()) => {
    const timestamps = userRequestLog.get(userId) ?? [];
    const recent = timestamps.filter((ts) => now - ts <= WINDOW_MS);
    if (recent.length >= MAX_REQUESTS) {
      userRequestLog.set(userId, recent);
      return false;
    }
    recent.push(now);
    userRequestLog.set(userId, recent);
    return true;
  };
}

function truncateMessagesForContext(messages, maxChars = 40000) {
  let total = 0;
  const kept = [];
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    total += messages[i].content.length;
    if (total > maxChars) break;
    kept.unshift(messages[i]);
  }
  return kept;
}

test('bootstrap admin allowed only when zero users', () => {
  assert.equal(evaluateSignupState(0, false).allowPublicSignup, true);
  assert.equal(evaluateSignupState(1, false).allowPublicSignup, false);
});

test('rate limit blocks after threshold', () => {
  const check = checkRateLimitFactory();
  for (let i = 0; i < 30; i += 1) assert.equal(check(42, 1000), true);
  assert.equal(check(42, 1000), false);
});

test('context truncation keeps latest messages within cap', () => {
  const messages = [
    { role: 'user', content: 'a'.repeat(10000) },
    { role: 'assistant', content: 'b'.repeat(10000) },
    { role: 'user', content: 'c'.repeat(10000) },
    { role: 'assistant', content: 'd'.repeat(10000) },
    { role: 'user', content: 'e'.repeat(1000) }
  ];
  const trimmed = truncateMessagesForContext(messages, 25000);
  assert.ok(trimmed.length < messages.length);
  assert.ok(trimmed.reduce((sum, msg) => sum + msg.content.length, 0) <= 25000);
  assert.equal(trimmed.at(-1).content.startsWith('e'), true);
});
