import { z } from 'zod';
import { EVENT_TYPES } from '../constants/eventTypes.js';

const statusSchema = z.enum(['draft', 'scheduled', 'published', 'expired']);
const text = (max) => z.string().trim().max(max).optional().transform((value) => value || undefined);
const recipientSchema = z.object({
  name: z.string().trim().min(1, 'Recipient name is required.').max(100),
  nickname: text(100),
});
const greetingSchema = z.object({
  title: z.string().trim().min(1, 'A title is required.').max(150),
  subtitle: text(280),
  letter: text(5000),
});
const scheduleSchema = z.object({
  status: statusSchema.default('draft'),
  publishAt: z.coerce.date().optional(),
  expireAt: z.coerce.date().optional(),
  timezone: text(100),
});

export const surpriseCreateSchema = z.object({
  eventType: z.enum(EVENT_TYPES),
  recipient: recipientSchema,
  greeting: greetingSchema,
  secretCode: z.string().trim().min(4, 'Secret code must be at least 4 characters.').max(100),
  schedule: scheduleSchema.optional(),
});

export const surpriseUpdateSchema = z.object({
  eventType: z.enum(EVENT_TYPES).optional(),
  recipient: recipientSchema.partial().optional(),
  greeting: greetingSchema.partial().optional(),
  secretCode: z.string().trim().min(4, 'Secret code must be at least 4 characters.').max(100).optional(),
  schedule: scheduleSchema.partial().optional(),
}).refine((values) => Object.keys(values).length > 0, 'Provide at least one field to update.');

export const surpriseListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().trim().max(100).optional(),
  status: statusSchema.optional(),
  eventType: z.enum(EVENT_TYPES).optional(),
});

export const mongoIdSchema = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid resource ID.') });
