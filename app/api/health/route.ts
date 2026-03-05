import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { env } from '@/app/lib/env';

export async function GET() {
  let db = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = 'error';
  }

  return NextResponse.json({ status: 'OK', version: env.BUILD_VERSION, db });
}
