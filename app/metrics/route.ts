import { NextResponse } from 'next/server';
import { getUserFromSession, isValidAdminTaskToken } from '@/app/lib/auth';
import { getMetricsSnapshot } from '@/app/lib/metrics';
import { getActiveStreamCount } from '@/app/lib/rate-limit';

export async function GET(req: Request) {
  const usingTaskToken = isValidAdminTaskToken(req);
  if (!usingTaskToken) {
    const user = await getUserFromSession();
    if (!user || !user.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json(getMetricsSnapshot(getActiveStreamCount()));
}
