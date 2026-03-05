import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/app/lib/db';

import { env } from '@/app/lib/env';

const SESSION_COOKIE = 'nas_gpt_session';
const CSRF_COOKIE = 'nas_gpt_csrf';
const SESSION_TTL_DAYS = 14;

function signValue(value: string) {
  return crypto.createHmac('sha256', process.env.AUTH_SECRET || 'dev-secret').update(value).digest('hex');
}

function encodeSession(id: string) {
  return `${id}.${signValue(id)}`;
}

function decodeSession(raw: string | undefined) {
  if (!raw) return null;
  const [id, signature] = raw.split('.');
  if (!id || !signature) return null;
  if (signValue(id) !== signature) return null;
  return id;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function issueCsrfToken() {
  const token = crypto.randomBytes(24).toString('hex');
  cookies().set({
    name: CSRF_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  });
  return token;
}

export async function verifyCsrfToken(req: Request) {
  const cookieToken = cookies().get(CSRF_COOKIE)?.value;
  const headerToken = req.headers.get('x-csrf-token');
  const contentType = req.headers.get('content-type') || '';
  if (headerToken && cookieToken && headerToken === cookieToken) return true;
  if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    const form = await req.clone().formData().catch(() => null);
    const bodyToken = form?.get('csrfToken');
    return Boolean(bodyToken && cookieToken && bodyToken === cookieToken);
  }
  return false;
}

export async function createSession(userId: number) {
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  const session = await prisma.session.create({ data: { userId, expiresAt } });
  cookies().set({
    name: SESSION_COOKIE,
    value: encodeSession(session.id),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt
  });
}

export async function destroySession() {
  const raw = cookies().get(SESSION_COOKIE)?.value;
  const sessionId = decodeSession(raw);
  if (sessionId) {
    await prisma.session.deleteMany({ where: { id: sessionId } });
  }
  cookies().delete(SESSION_COOKIE);
}

export async function getUserFromSession() {
  const raw = cookies().get(SESSION_COOKIE)?.value;
  const sessionId = decodeSession(raw);
  if (!sessionId) return null;

  const session = await prisma.session.findFirst({
    where: { id: sessionId, expiresAt: { gt: new Date() } },
    include: { user: true }
  });

  if (!session || session.user.isDisabled) return null;
  return session.user;
}

export async function requireUser() {
  const user = await getUserFromSession();
  if (!user) redirect('/login');
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user.isAdmin) redirect('/chat');
  return user;
}


export function extractBearerToken(authHeader: string | null) {
  if (!authHeader) return null;
  const [scheme, token] = authHeader.trim().split(/\s+/, 2);
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') return null;
  return token;
}

export function isValidAdminTaskToken(req: Request) {
  if (!env.ADMIN_TASK_TOKEN) return false;
  const token = extractBearerToken(req.headers.get('authorization'));
  return Boolean(token && token === env.ADMIN_TASK_TOKEN);
}

export function getRequestIp() {
  const h = headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
}
