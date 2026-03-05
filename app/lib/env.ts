const required = ['OPENAI_API_KEY', 'AUTH_SECRET', 'APP_URL', 'DATABASE_URL'] as const;

for (const key of required) {
  if (!process.env[key]) {
    console.warn(`Missing environment variable: ${key}`);
  }
}

export const env = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? '',
  AUTH_SECRET: process.env.AUTH_SECRET ?? '',
  APP_URL: process.env.APP_URL ?? 'http://localhost:3000',
  DATABASE_URL: process.env.DATABASE_URL ?? 'file:./prisma/dev.db'
};
