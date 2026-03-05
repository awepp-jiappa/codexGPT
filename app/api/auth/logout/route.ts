import { NextResponse } from 'next/server';
import { destroySession, verifyCsrfToken } from '@/app/lib/auth';

export async function POST(req: Request) {
  if (!(await verifyCsrfToken(req))) {
    return NextResponse.redirect(new URL('/chat?error=csrf', req.url));
  }
  await destroySession();
  return NextResponse.redirect(new URL('/login', req.url));
}
