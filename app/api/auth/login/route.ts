import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { createSession, getRequestIp } from '@/app/lib/auth';
import { verifyCsrfToken } from '@/app/lib/csrf';
import { loginSchema } from '@/app/lib/validation';
import { getLockoutRemainingMs, recordLoginAttempt } from '@/app/lib/security';
import { verifyPassword } from '@/app/lib/auth';

export async function POST(req: Request) {
  if (!(await verifyCsrfToken(req))) return NextResponse.redirect(new URL('/login?error=csrf', req.url));

  const formData = await req.formData();
  const parsed = loginSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password')
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL('/login?error=invalid', req.url));
  }

  const ip = getRequestIp();
  const lockoutRemaining = await getLockoutRemainingMs(parsed.data.username, ip);
  if (lockoutRemaining > 0) {
    return NextResponse.redirect(new URL('/login?error=locked', req.url));
  }

  const user = await prisma.user.findUnique({ where: { username: parsed.data.username } });
  const validPassword = user ? await verifyPassword(parsed.data.password, user.passwordHash) : false;

  if (!user || !validPassword || user.isDisabled) {
    await recordLoginAttempt(parsed.data.username, ip, false);
    const reason = user?.isDisabled ? 'disabled' : 'creds';
    return NextResponse.redirect(new URL(`/login?error=${reason}`, req.url));
  }

  await recordLoginAttempt(parsed.data.username, ip, true);
  await createSession(user.id);
  return NextResponse.redirect(new URL('/chat', req.url));
}
