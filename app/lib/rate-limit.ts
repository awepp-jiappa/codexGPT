const userRequestLog = new Map<number, number[]>();
const userConcurrentStreams = new Map<number, number>();

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;
const MAX_CONCURRENT = 5;

export function checkRateLimit(userId: number) {
  const now = Date.now();
  const timestamps = userRequestLog.get(userId) ?? [];
  const recent = timestamps.filter((ts) => now - ts <= WINDOW_MS);

  if (recent.length >= MAX_REQUESTS) {
    userRequestLog.set(userId, recent);
    return false;
  }

  recent.push(now);
  userRequestLog.set(userId, recent);
  return true;
}

export function tryStartStream(userId: number) {
  const current = userConcurrentStreams.get(userId) ?? 0;
  if (current >= MAX_CONCURRENT) return false;
  userConcurrentStreams.set(userId, current + 1);
  return true;
}

export function endStream(userId: number) {
  const current = userConcurrentStreams.get(userId) ?? 0;
  if (current <= 1) {
    userConcurrentStreams.delete(userId);
    return;
  }
  userConcurrentStreams.set(userId, current - 1);
}

export function __resetRateLimitsForTests() {
  userRequestLog.clear();
  userConcurrentStreams.clear();
}
