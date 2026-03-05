import { prisma } from '@/app/lib/db';
import { env } from '@/app/lib/env';

export function evaluateSignupState(userCount: number, allowPublicSignupEnv: boolean) {
  const bootstrapMode = userCount === 0;
  return {
    userCount,
    bootstrapMode,
    allowPublicSignup: bootstrapMode || allowPublicSignupEnv
  };
}

export async function getSignupState() {
  const userCount = await prisma.user.count();
  return evaluateSignupState(userCount, env.ALLOW_PUBLIC_SIGNUP);
}
