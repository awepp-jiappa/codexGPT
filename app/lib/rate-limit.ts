const userRequestLog = new Map<number, number[]>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;

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
