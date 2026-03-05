const required = ['OPENAI_API_KEY', 'AUTH_SECRET', 'APP_URL', 'DATABASE_URL'] as const;

for (const key of required) {
  if (!process.env[key]) {
    console.warn(`Missing environment variable: ${key}`);
  }
}

function toNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export const env = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? '',
  AUTH_SECRET: process.env.AUTH_SECRET ?? '',
  APP_URL: process.env.APP_URL ?? 'http://localhost:3000',
  DATABASE_URL: process.env.DATABASE_URL ?? 'file:./prisma/dev.db',
  ALLOW_PUBLIC_SIGNUP: process.env.ALLOW_PUBLIC_SIGNUP === 'true',
  BUILD_VERSION: process.env.BUILD_VERSION ?? process.env.npm_package_version ?? 'dev',
  RETENTION_DAYS_MESSAGES: toNumber(process.env.RETENTION_DAYS_MESSAGES, 0),
  RETENTION_DAYS_USAGE: toNumber(process.env.RETENTION_DAYS_USAGE, 90),
  ADMIN_TASK_TOKEN: process.env.ADMIN_TASK_TOKEN ?? '',
  OPS_WEBHOOK_URL: process.env.OPS_WEBHOOK_URL ?? ''
};
