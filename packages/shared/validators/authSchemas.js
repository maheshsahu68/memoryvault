import { z } from 'zod';

const nameSchema = z.string().trim().min(2, 'Name must be at least 2 characters.').max(100, 'Name must be at most 100 characters.');
const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address.').max(254);
const passwordSchema = z.string().min(8, 'Password must be at least 8 characters.').max(128, 'Password must be at most 128 characters.');

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required.').max(128),
});
