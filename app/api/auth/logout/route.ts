import { NextResponse } from 'next/server';
import { destroySession } from '@/app/lib/auth';
import { verifyCsrfToken } from '@/app/lib/csrf';

export async function POST(req: Request) {
  if (!(await verifyCsrfToken(req))) {
    return NextResponse.redirect(new URL('/chat?error=csrf', req.url));
  }
  await destroySession();
  return NextResponse.redirect(new URL('/login', req.url));
}
