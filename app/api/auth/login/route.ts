import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { createSession, verifyPassword } from '@/app/lib/auth';
import { authSchema } from '@/app/lib/validation';

export async function POST(req: Request) {
  const formData = await req.formData();
  const parsed = authSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password')
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL('/login?error=invalid', req.url));
  }

  const user = await prisma.user.findUnique({ where: { username: parsed.data.username } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return NextResponse.redirect(new URL('/login?error=creds', req.url));
  }

  await createSession(user.id);
  return NextResponse.redirect(new URL('/chat', req.url));
}
