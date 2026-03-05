const globalRuntime = globalThis as unknown as { __startedAt?: number };

if (!globalRuntime.__startedAt) {
  globalRuntime.__startedAt = Date.now();
}

export function getUptimeSeconds() {
  return Math.floor((Date.now() - (globalRuntime.__startedAt ?? Date.now())) / 1000);
}
