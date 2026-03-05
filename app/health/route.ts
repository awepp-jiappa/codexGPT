import { NextResponse } from 'next/server';
import { ensureStartupEvent, prisma } from '@/app/lib/db';
import { env } from '@/app/lib/env';
import { getUptimeSeconds } from '@/app/lib/runtime';

export async function GET() {
  await ensureStartupEvent();
  let dbOk = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbOk = false;
  }

  return NextResponse.json({ status: 'OK', version: env.BUILD_VERSION, uptime: getUptimeSeconds(), db_ok: dbOk });
}
