import { NextResponse } from 'next/server';
import { getUserFromSession } from '@/app/lib/auth';
import { getMetricsSnapshot } from '@/app/lib/metrics';
import { getActiveStreamCount } from '@/app/lib/rate-limit';

export async function GET() {
  const user = await getUserFromSession();
  if (!user || !user.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(getMetricsSnapshot(getActiveStreamCount()));
}
