import Link from 'next/link';

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form action="/api/auth/register" method="post" className="w-full max-w-sm space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h1 className="text-xl font-semibold">Create account</h1>
        <input name="username" placeholder="Username" required className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2" />
        <input name="password" type="password" placeholder="Password" required className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2" />
        <button type="submit" className="w-full rounded-md bg-emerald-600 px-4 py-2 font-medium hover:bg-emerald-500">Register</button>
        <p className="text-sm text-zinc-400">Already have an account? <Link href="/login" className="text-emerald-400">Login</Link></p>
      </form>
    </main>
  );
}
