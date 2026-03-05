'use client';

import { useEffect, useState } from 'react';

type User = { id: number; username: string; isAdmin: boolean; isDisabled: boolean };
type UsageRow = { userId: number; username: string; date: string; totalRequests: number; totalTokens: number; estimatedCostUsd: number };
type EventRow = { id: number; createdAt: string; message: string; metaJson: string | null };

export function AdminUsers({
  initialUsers,
  initialUsageRows,
  errorEvents,
  appVersion,
  dbOk,
  csrfToken
}: {
  initialUsers: User[];
  initialUsageRows: UsageRow[];
  errorEvents: EventRow[];
  appVersion: string;
  dbOk: boolean;
  csrfToken: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [usageRows, setUsageRows] = useState(initialUsageRows);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [usageFilterUserId, setUsageFilterUserId] = useState('');
  const [usageFilterFrom, setUsageFilterFrom] = useState('');
  const [usageFilterTo, setUsageFilterTo] = useState('');

  useEffect(() => {
    void fetch('/metrics').then((res) => (res.ok ? res.json() : null)).then((data) => setMetrics(data)).catch(() => setMetrics(null));
  }, []);

  async function createUser() {
    const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken }, body: JSON.stringify({ username, password }) });
    if (!res.ok) return;
    const data = await res.json();
    setUsers((prev) => [...prev, data.user]);
    setUsername('');
    setPassword('');
  }

  async function toggleDisable(user: User) {
    const res = await fetch(`/api/admin/users/${user.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken }, body: JSON.stringify({ isDisabled: !user.isDisabled }) });
    if (!res.ok) return;
    const data = await res.json();
    setUsers((prev) => prev.map((u) => (u.id === user.id ? data.user : u)));
  }

  async function refreshUsage() {
    const query = new URLSearchParams();
    if (usageFilterUserId) query.set('userId', usageFilterUserId);
    if (usageFilterFrom) query.set('from', usageFilterFrom);
    if (usageFilterTo) query.set('to', usageFilterTo);
    const res = await fetch(`/api/admin/usage?${query.toString()}`);
    if (!res.ok) return;
    const data = await res.json();
    setUsageRows(data.rows);
  }

  async function runCleanup() {
    await fetch('/api/admin/maintenance/cleanup', { method: 'POST', headers: { 'x-csrf-token': csrfToken } });
    await Promise.all([refreshUsage(), fetch('/metrics').then((res) => (res.ok ? res.json() : null)).then((data) => setMetrics(data))]);
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-6">
      <section>
        <h1 className="mb-2 text-xl font-semibold">Admin Operations</h1>
        <p className="text-sm text-zinc-400">Build: {appVersion} · DB: {dbOk ? 'ok' : 'error'}</p>
        {metrics && <pre className="mt-2 overflow-auto rounded border border-zinc-800 p-2 text-xs">{JSON.stringify(metrics, null, 2)}</pre>}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">User Management</h2>
        <div className="mb-6 flex gap-2">
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2" />
          <button onClick={createUser} className="rounded bg-emerald-600 px-4">Create</button>
        </div>
        <ul className="space-y-2">
          {users.map((user) => (
            <li key={user.id} className="flex items-center justify-between rounded border border-zinc-800 p-3">
              <span>{user.username} {user.isAdmin ? '(admin)' : ''} {user.isDisabled ? '(disabled)' : ''}</span>
              {!user.isAdmin && <button onClick={() => toggleDisable(user)} className="text-sm text-emerald-300">{user.isDisabled ? 'Enable' : 'Disable'}</button>}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <h2 className="mr-2 text-lg font-medium">Usage Rollups</h2>
          <input value={usageFilterUserId} onChange={(e) => setUsageFilterUserId(e.target.value)} placeholder="user id" className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm" />
          <input type="date" value={usageFilterFrom} onChange={(e) => setUsageFilterFrom(e.target.value)} className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm" />
          <input type="date" value={usageFilterTo} onChange={(e) => setUsageFilterTo(e.target.value)} className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm" />
          <button onClick={refreshUsage} className="rounded border border-zinc-700 px-3 py-1 text-sm">Apply</button>
          <button onClick={runCleanup} className="rounded border border-emerald-700 px-3 py-1 text-sm text-emerald-300">Run cleanup</button>
        </div>
        <div className="overflow-auto rounded border border-zinc-800">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-900"><tr><th className="p-2 text-left">Date</th><th className="p-2 text-left">User</th><th className="p-2 text-right">Requests</th><th className="p-2 text-right">Tokens</th><th className="p-2 text-right">Est. Cost (USD)</th></tr></thead>
            <tbody>
              {usageRows.map((row, idx) => (
                <tr key={`${row.userId}-${row.date}-${idx}`} className="border-t border-zinc-800">
                  <td className="p-2">{row.date}</td><td className="p-2">{row.username}</td><td className="p-2 text-right">{row.totalRequests}</td><td className="p-2 text-right">{row.totalTokens}</td><td className="p-2 text-right">{Number(row.estimatedCostUsd).toFixed(6)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium">Recent Error Events</h2>
        <p className="mb-2 text-xs text-zinc-500">If empty, inspect container logs: docker logs nas-gpt-chat --tail 100</p>
        <ul className="space-y-2 text-xs">
          {errorEvents.map((event) => (
            <li key={event.id} className="rounded border border-zinc-800 p-2">
              <div>{event.createdAt} · {event.message}</div>
              {event.metaJson && <pre className="overflow-auto text-zinc-400">{event.metaJson}</pre>}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
