type MetricsState = {
  totalRequests: number;
  totalErrors: number;
  lastCleanupTime: string | null;
};

const globalForMetrics = globalThis as unknown as { __nasMetrics?: MetricsState };

const state = globalForMetrics.__nasMetrics ?? {
  totalRequests: 0,
  totalErrors: 0,
  lastCleanupTime: null
};

globalForMetrics.__nasMetrics = state;

export function incrementTotalRequests() {
  state.totalRequests += 1;
}

export function incrementTotalErrors() {
  state.totalErrors += 1;
}

export function setLastCleanupTime(value: string) {
  state.lastCleanupTime = value;
}

export function getMetricsSnapshot(activeStreams: number) {
  return {
    total_requests: state.totalRequests,
    total_errors: state.totalErrors,
    active_streams: activeStreams,
    last_cleanup_time: state.lastCleanupTime
  };
}
