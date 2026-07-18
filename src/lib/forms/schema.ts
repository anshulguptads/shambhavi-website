/**
 * Shared validation for form submissions (demo/pilot requests + contact).
 * Used by both the API routes (authoritative) and any client-side hints.
 */
import { z } from 'zod';

export const PLATFORM_SLUGS = ['aspirems', 'neurolink', 'sanadeep', 'insighttest'] as const;
export type PlatformSlug = (typeof PLATFORM_SLUGS)[number];

export const CONTACT_TOPICS = ['partnership', 'press', 'careers', 'support', 'general', 'parent-or-student'] as const;
export type ContactTopic = (typeof CONTACT_TOPICS)[number];

const trimmed = z.string().transform((s) => s.trim());
const requiredText = (max: number) => trimmed.pipe(z.string().min(1).max(max));
const optionalText = (max: number) =>
  z
    .string()
    .optional()
    .transform((s) => {
      const t = s?.trim();
      return t ? t : undefined;
    })
    .pipe(z.string().max(max).optional());

const email = trimmed.pipe(z.email().max(200));

export const demoRequestSchema = z.object({
  kind: z.literal('demo-request').default('demo-request'),
  name: requiredText(120),
  email,
  organisation: requiredText(200),
  role: optionalText(120),
  platforms: z.array(z.enum(PLATFORM_SLUGS)).min(1).max(PLATFORM_SLUGS.length),
  orgType: optionalText(60),
  country: optionalText(90),
  phone: optionalText(40),
  message: optionalText(4000),
});

export const contactSchema = z.object({
  kind: z.literal('contact').default('contact'),
  name: requiredText(120),
  email,
  topic: z.enum(CONTACT_TOPICS),
  message: requiredText(4000),
});

export type DemoRequest = z.infer<typeof demoRequestSchema>;
export type Contact = z.infer<typeof contactSchema>;
export type Submission = DemoRequest | Contact;
export type SubmissionKind = Submission['kind'];

export type FieldErrors = Record<string, string>;
export type ParseResult = { ok: true; value: Submission } | { ok: false; errors: FieldErrors };

/** Normalize FormData (multi-value platforms) or a JSON object into a plain record. */
function toRecord(data: FormData | unknown): Record<string, unknown> {
  if (data instanceof FormData) {
    const rec: Record<string, unknown> = {};
    for (const key of new Set(data.keys())) {
      if (key === 'platforms') rec[key] = data.getAll(key).map(String);
      else rec[key] = String(data.get(key) ?? '');
    }
    return rec;
  }
  if (typeof data === 'object' && data !== null) return data as Record<string, unknown>;
  return {};
}

export function parseSubmission(kind: SubmissionKind, data: FormData | unknown): ParseResult {
  const schema = kind === 'demo-request' ? demoRequestSchema : contactSchema;
  const parsed = schema.safeParse({ ...toRecord(data), kind });
  if (parsed.success) return { ok: true, value: parsed.data };

  const errors: FieldErrors = {};
  for (const issue of parsed.error.issues) {
    const field = String(issue.path[0] ?? 'form');
    if (!errors[field]) errors[field] = issue.message;
  }
  return { ok: false, errors };
}
