/**
 * Input Validation Schemas
 * Ensures all API inputs are properly validated and sanitized
 */

import { z } from 'zod';

// Maximum lengths to prevent abuse
const MAX_MESSAGE_LENGTH = 5000;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 255;
const MAX_SESSION_ID_LENGTH = 100;

/**
 * Sanitize string input - remove potentially dangerous characters
 */
const sanitizedString = z.string().transform((val) => {
  // Remove null bytes and control characters
  return val.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
});

/**
 * Chat message validation
 */
export const chatMessageSchema = z.object({
  message: sanitizedString
    .min(1, 'Message is required')
    .max(MAX_MESSAGE_LENGTH, `Message must be less than ${MAX_MESSAGE_LENGTH} characters`)
    .refine(
      (val) => !/<script|javascript:|on\w+=/i.test(val),
      'Message contains potentially unsafe content'
    ),
  sessionId: z.string().max(MAX_SESSION_ID_LENGTH).optional(),
  userPreferences: z.object({
    email: z.string().email().max(MAX_EMAIL_LENGTH).optional(),
    name: sanitizedString.max(MAX_NAME_LENGTH).optional(),
    interests: z.array(sanitizedString.max(50)).max(20).optional(),
    role: sanitizedString.max(50).optional(),
    goals: z.array(sanitizedString.max(100)).max(10).optional(),
    days: z.array(z.string()).max(7).optional(),
  }).optional(),
});

/**
 * User registration validation
 */
export const registrationSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .max(MAX_EMAIL_LENGTH)
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password is too long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase, and numbers'
    ),
  name: sanitizedString
    .min(1, 'Name is required')
    .max(MAX_NAME_LENGTH),
  company: sanitizedString.max(100).optional(),
  role: sanitizedString.max(50).optional(),
});

/**
 * User login validation
 */
export const loginSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .max(MAX_EMAIL_LENGTH)
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(1, 'Password is required')
    .max(100),
});

/**
 * Profile update validation
 */
export const profileUpdateSchema = z.object({
  name: sanitizedString.max(MAX_NAME_LENGTH).optional(),
  company: sanitizedString.max(100).optional(),
  role: sanitizedString.max(50).optional(),
  interests: z.array(sanitizedString.max(50)).max(20).optional(),
  goals: z.array(sanitizedString.max(100)).max(10).optional(),
});

/**
 * Session ID validation
 */
export const sessionIdSchema = z.string()
  .max(MAX_SESSION_ID_LENGTH)
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid session ID format');

/**
 * Search query validation
 */
export const searchQuerySchema = z.object({
  query: sanitizedString
    .min(1, 'Search query is required')
    .max(500, 'Search query is too long'),
  filters: z.object({
    day: z.string().optional(),
    track: z.string().optional(),
    format: z.string().optional(),
    level: z.string().optional(),
  }).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

/**
 * Agenda builder validation
 */
export const agendaBuilderSchema = z.object({
  interests: z.array(sanitizedString.max(50))
    .min(1, 'At least one interest is required')
    .max(20),
  days: z.array(z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']))
    .min(1, 'At least one day is required')
    .max(7),
  sessionTypes: z.array(z.string()).optional(),
  maxSessions: z.number().min(1).max(50).optional(),
});

/**
 * Favorite toggle validation
 */
export const favoriteToggleSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  action: z.enum(['add', 'remove']),
});

/**
 * Export format validation
 */
export const exportFormatSchema = z.object({
  format: z.enum(['ics', 'pdf', 'csv', 'json']),
  sessionIds: z.array(z.string().uuid()).optional(),
});

/**
 * Admin action validation
 */
export const adminActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'delete', 'suspend', 'activate']),
  targetId: z.string().uuid(),
  reason: sanitizedString.max(500).optional(),
});

/**
 * Validate and sanitize input
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      return { success: false, errors };
    }
    return { success: false, errors: ['Invalid input'] };
  }
}

/**
 * Sanitize HTML content (for display purposes)
 */
export function sanitizeHtml(html: string): string {
  // Remove script tags and event handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/on\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '');
}

/**
 * Validate MongoDB ObjectId format
 */
export const objectIdSchema = z.string().regex(
  /^[0-9a-fA-F]{24}$/,
  'Invalid ID format'
);

/**
 * Validate UUID format
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Rate limit key validation
 */
export const rateLimitKeySchema = z.string()
  .max(255)
  .regex(/^[a-zA-Z0-9:_-]+$/, 'Invalid rate limit key');