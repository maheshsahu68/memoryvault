import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const optionalString = z.string().trim().optional().transform((value) => value || undefined);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().trim().url('MONGODB_URI must be a valid MongoDB connection URL.'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters.'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters.'),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('30d'),
  VIEW_TOKEN_SECRET: z.string().min(32, 'VIEW_TOKEN_SECRET must be at least 32 characters.'),
  CSRF_COOKIE_NAME: z.string().min(1).default('csrfToken'),
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  CLIENT_URL: z.string().url('CLIENT_URL must be a valid URL.'),
  COOKIE_DOMAIN: optionalString,
  COOKIE_SAMESITE: z.enum(['None', 'Lax', 'Strict']).default('None'),
  EMAIL_PROVIDER_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().email('EMAIL_FROM must be a valid email address.'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `- ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(`Invalid server environment configuration:\n${details}`);
}

export const env = Object.freeze(parsed.data);
