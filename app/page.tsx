import { redirect } from 'next/navigation';
import { getUserFromSession } from '@/app/lib/auth';

export default async function HomePage() {
  const user = await getUserFromSession();
  redirect(user ? '/chat' : '/login');
}
