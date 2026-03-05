'use client';

import { useState } from 'react';

type User = { id: number; username: string; isAdmin: boolean; isDisabled: boolean };

export function AdminUsers({ initialUsers, csrfToken }: { initialUsers: User[]; csrfToken: string }) {
  const [users, setUsers] = useState(initialUsers);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

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

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Admin user management</h1>
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
    </main>
  );
}
