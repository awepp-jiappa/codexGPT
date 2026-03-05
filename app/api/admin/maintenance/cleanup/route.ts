import { NextResponse } from 'next/server';
import { isValidAdminTaskToken, requireAdmin, verifyCsrfToken } from '@/app/lib/auth';
import { runRetentionCleanup } from '@/app/lib/maintenance';

export async function POST(req: Request) {
  const usingTaskToken = isValidAdminTaskToken(req);
  if (!usingTaskToken) {
    if (!(await verifyCsrfToken(req))) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
    await requireAdmin();
  }

  const result = await runRetentionCleanup();
  return NextResponse.json({ ok: true, ...result });
}
