import Link from 'next/link';
import { issueCsrfToken } from '@/app/lib/auth';

export default function LoginPage({ searchParams }: { searchParams?: { error?: string } }) {
  const csrfToken = issueCsrfToken();

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form action="/api/auth/login" method="post" className="w-full max-w-sm space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h1 className="text-xl font-semibold">Login</h1>
        {searchParams?.error && <p className="text-sm text-rose-400">Login failed: {searchParams.error}</p>}
        <input type="hidden" name="csrfToken" value={csrfToken} />
        <input name="username" placeholder="Username" required className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2" />
        <input name="password" type="password" placeholder="Password" required className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2" />
        <button type="submit" className="w-full rounded-md bg-emerald-600 px-4 py-2 font-medium hover:bg-emerald-500">Sign in</button>
        <p className="text-sm text-zinc-400">No account? <Link href="/register" className="text-emerald-400">Register</Link></p>
      </form>
    </main>
  );
}
