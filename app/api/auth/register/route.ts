import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { authSchema } from '@/app/lib/validation';
import { createSession } from '@/app/lib/auth';
import { verifyCsrfToken } from '@/app/lib/csrf';
import { env } from '@/app/lib/env';
import { hashPassword } from '@/app/lib/auth';

export async function POST(req: Request) {
  if (!(await verifyCsrfToken(req))) return NextResponse.redirect(new URL('/register?error=csrf', req.url));

  const userCount = await prisma.user.count();
  const bootstrapMode = userCount === 0;
  if (!bootstrapMode && !env.ALLOW_PUBLIC_SIGNUP) {
    return NextResponse.redirect(new URL('/register?error=disabled', req.url));
  }

  const formData = await req.formData();
  const parsed = authSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password')
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL('/register?error=invalid', req.url));
  }

  const exists = await prisma.user.findUnique({ where: { username: parsed.data.username } });
  if (exists) {
    return NextResponse.redirect(new URL('/register?error=taken', req.url));
  }

  const user = await prisma.user.create({
    data: {
      username: parsed.data.username,
      passwordHash: await hashPassword(parsed.data.password),
      isAdmin: bootstrapMode
    }
  });

  await prisma.userSettings.create({ data: { userId: user.id } });
  await createSession(user.id);
  return NextResponse.redirect(new URL('/chat', req.url));
}
