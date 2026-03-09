import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { getUserFromSession } from '@/app/lib/auth';
import { verifyCsrfToken } from '@/app/lib/csrf';
import { settingsSchema } from '@/app/lib/validation';

export async function GET() {
  const user = await getUserFromSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const settings = await prisma.userSettings.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
  return NextResponse.json({ settings });
}

export async function PUT(req: Request) {
  const user = await getUserFromSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await verifyCsrfToken(req))) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

  const settings = await prisma.userSettings.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...parsed.data },
    update: parsed.data
  });

  return NextResponse.json({ settings });
}
