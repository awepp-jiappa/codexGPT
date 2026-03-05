import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { hashPassword, requireAdmin, verifyCsrfToken } from '@/app/lib/auth';
import { userCreateSchema } from '@/app/lib/validation';

export async function GET() {
  await requireAdmin();
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  await requireAdmin();
  if (!(await verifyCsrfToken(req))) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = userCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

  const exists = await prisma.user.findUnique({ where: { username: parsed.data.username } });
  if (exists) return NextResponse.json({ error: 'Username already exists' }, { status: 409 });

  const user = await prisma.user.create({
    data: { username: parsed.data.username, passwordHash: await hashPassword(parsed.data.password), isAdmin: false }
  });

  await prisma.userSettings.create({ data: { userId: user.id } });
  return NextResponse.json({ user });
}
