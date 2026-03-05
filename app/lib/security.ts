import { prisma } from '@/app/lib/db';

const LOCKOUT_MAX_ATTEMPTS = 10;
const LOCKOUT_WINDOW_MINUTES = 15;
const LOCKOUT_DURATION_MINUTES = 15;

function windowStart() {
  return new Date(Date.now() - LOCKOUT_WINDOW_MINUTES * 60 * 1000);
}

export async function recordLoginAttempt(username: string, ipAddress: string, successful: boolean) {
  await prisma.loginAttempt.create({ data: { username, ipAddress, successful } });
}

export async function getLockoutRemainingMs(username: string, ipAddress: string) {
  const attempts = await prisma.loginAttempt.findMany({
    where: {
      username,
      ipAddress,
      successful: false,
      attemptedAt: { gte: windowStart() }
    },
    orderBy: { attemptedAt: 'desc' },
    take: LOCKOUT_MAX_ATTEMPTS
  });

  if (attempts.length < LOCKOUT_MAX_ATTEMPTS) return 0;

  const oldestInWindow = attempts[attempts.length - 1];
  const unlockAt = oldestInWindow.attemptedAt.getTime() + LOCKOUT_DURATION_MINUTES * 60 * 1000;
  return Math.max(0, unlockAt - Date.now());
}

export function truncateMessagesForContext(messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>, maxChars = 40000) {
  let total = 0;
  const kept: typeof messages = [];

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    total += message.content.length;
    if (total > maxChars) break;
    kept.unshift(message);
  }

  return kept;
}

export function makeConversationTitle(firstMessage: string) {
  const words = firstMessage.trim().split(/\s+/).filter(Boolean).slice(0, 10);
  return words.join(' ').slice(0, 120) || 'New Chat';
}
