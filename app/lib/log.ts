export function logInfo(event: string, payload: Record<string, unknown>) {
  console.info(JSON.stringify({ level: 'info', event, timestamp: new Date().toISOString(), ...payload }));
}

export function logError(event: string, payload: Record<string, unknown>) {
  console.error(JSON.stringify({ level: 'error', event, timestamp: new Date().toISOString(), ...payload }));
}
