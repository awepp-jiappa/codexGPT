import { z } from 'zod';

const weakPasswords = new Set(['password', 'password123', '1234567890', 'qwerty12345', 'letmein12345', 'adminadmin', 'welcome12345']);

const usernameSchema = z.string().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/);

export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1).max(128)
});

export const authSchema = z.object({
  username: usernameSchema,
  password: z
    .string()
    .min(10)
    .max(128)
    .refine((value) => !weakPasswords.has(value.toLowerCase()), 'Password is too weak')
});

export const chatSchema = z.object({
  conversationId: z.number().int().positive().optional(),
  message: z.string().min(1).max(8000),
  regenerate: z.boolean().optional().default(false)
});

export const titleSchema = z.object({
  title: z.string().min(1).max(120)
});

export const userCreateSchema = authSchema;

export const settingsSchema = z.object({
  model: z.string().min(1).max(80).default('gpt-4o-mini'),
  temperature: z.number().min(0).max(1).default(0.7),
  systemPrompt: z.string().max(4000).default('')
});
