import { z } from 'zod';

export const authSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(8).max(128)
});

export const chatSchema = z.object({
  conversationId: z.number().int().positive().optional(),
  message: z.string().min(1).max(8000)
});

export const titleSchema = z.object({
  title: z.string().min(1).max(120)
});
