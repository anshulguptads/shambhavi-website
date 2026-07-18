/**
 * Form submission pipeline with a per-integration degradation contract:
 * every dependency (Turnstile, D1, email) is optional; success means the
 * lead landed in AT LEAST one durable place. Only when nothing could take
 * it do we fail — loudly, with a mailto fallback for the human.
 */
import { parseSubmission, type FieldErrors, type Submission, type SubmissionKind } from './schema';

export interface SubmissionMeta {
  cfCountry?: string;
  userAgent?: string;
  ip?: string;
}

export interface FormDeps {
  /** Present only when TURNSTILE_SECRET_KEY is configured. */
  verifyTurnstile?: (token: string | undefined, ip?: string) => Promise<boolean>;
  /** Present only when the D1 binding exists. */
  insertRow?: (s: Submission, meta: SubmissionMeta, emailSent: boolean) => Promise<void>;
  /** Present only when RESEND_API_KEY is configured. */
  sendEmail?: (s: Submission, meta: SubmissionMeta) => Promise<void>;
}

export interface HandleOpts {
  honeypotFilled: boolean;
  turnstileToken?: string;
  meta?: SubmissionMeta;
}

export interface HandleResult {
  status: 200 | 400 | 403 | 503;
  body: { ok: boolean; errors?: FieldErrors; message?: string };
}

const FALLBACK_MESSAGE =
  "We couldn't take your message automatically right now — please email us directly at info@shambhavilabs.com and we'll get back to you.";

export async function handleSubmission(
  kind: SubmissionKind,
  raw: FormData | unknown,
  deps: FormDeps,
  opts: HandleOpts
): Promise<HandleResult> {
  // Honeypot bots get a cheerful nothing.
  if (opts.honeypotFilled) return { status: 200, body: { ok: true } };

  const parsed = parseSubmission(kind, raw);
  if (!parsed.ok) return { status: 400, body: { ok: false, errors: parsed.errors } };

  if (deps.verifyTurnstile) {
    const human = await deps.verifyTurnstile(opts.turnstileToken, opts.meta?.ip);
    if (!human) {
      return {
        status: 403,
        body: { ok: false, message: 'Spam check failed — please try again, or email info@shambhavilabs.com.' },
      };
    }
  }

  const meta = opts.meta ?? {};

  let emailSent = false;
  if (deps.sendEmail) {
    try {
      await deps.sendEmail(parsed.value, meta);
      emailSent = true;
    } catch (err) {
      console.error('[forms] email failed:', err);
    }
  }

  let stored = false;
  if (deps.insertRow) {
    try {
      await deps.insertRow(parsed.value, meta, emailSent);
      stored = true;
    } catch (err) {
      console.error('[forms] d1 insert failed:', err);
    }
  }

  if (emailSent || stored) return { status: 200, body: { ok: true } };

  console.error('[forms] submission had nowhere to go (no configured integration succeeded)');
  return { status: 503, body: { ok: false, message: FALLBACK_MESSAGE } };
}
