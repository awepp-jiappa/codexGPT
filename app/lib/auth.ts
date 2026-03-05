import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/app/lib/db';

const SESSION_COOKIE = 'nas_gpt_session';
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

  if (!session) return null;
  return session.user;
}

export async function requireUser() {
  const user = await getUserFromSession();
  if (!user) redirect('/login');
  return user;
}
