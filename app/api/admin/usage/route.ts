import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { requireAdmin } from '@/app/lib/auth';

export async function GET(req: Request) {
  await requireAdmin();
  const { searchParams } = new URL(req.url);
  const userId = Number(searchParams.get('userId') || '0') || undefined;
  const from = searchParams.get('from') || undefined;
  const to = searchParams.get('to') || undefined;

  const where = {
    ...(userId ? { userId } : {}),
    ...(from || to
      ? {
          date: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {})
          }
        }
      : {})
  };

  const rows = await prisma.dailyUsageRollup.findMany({
    where,
    orderBy: { date: 'desc' },
    include: { user: { select: { id: true, username: true } } }
  });

  return NextResponse.json({
    rows: rows.map((row) => ({
      userId: row.userId,
      username: row.user.username,
      date: row.date,
      totalRequests: row.totalRequests,
      totalTokens: row.totalTokens,
      estimatedCostUsd: Number(row.estimatedCostUsd.toFixed(8))
    }))
  });
}
