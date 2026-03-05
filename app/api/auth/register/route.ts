import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { authSchema } from '@/app/lib/validation';
import { createSession, hashPassword } from '@/app/lib/auth';

export async function POST(req: Request) {
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
      passwordHash: await hashPassword(parsed.data.password)
    }
  });

  await createSession(user.id);
  return NextResponse.redirect(new URL('/chat', req.url));
}
