/**
 * Shared APIRoute factory for the two form endpoints. Accepts both fetch/JSON
 * (progressive enhancement) and plain form-encoded POSTs (no-JS fallback).
 */
import type { APIRoute } from 'astro';
import { handleSubmission } from './handle';
import { buildDeps } from './integrations';
import type { SubmissionKind } from './schema';

/** Classic honeypot — a field humans never see or fill. */
export const HONEYPOT_FIELD = 'website';

interface Payload {
  data: FormData | unknown;
  honeypotFilled: boolean;
  token?: string;
  wantsJson: boolean;
}

async function readPayload(request: Request): Promise<Payload> {
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const json = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return {
      data: json,
      honeypotFilled: Boolean(json[HONEYPOT_FIELD]),
      token: typeof json['cf-turnstile-response'] === 'string' ? (json['cf-turnstile-response'] as string) : undefined,
      wantsJson: true,
    };
  }
  const fd = await request.formData().catch(() => new FormData());
  return {
    data: fd,
    honeypotFilled: Boolean(fd.get(HONEYPOT_FIELD)),
    token: String(fd.get('cf-turnstile-response') ?? '') || undefined,
    wantsJson: (request.headers.get('accept') ?? '').includes('application/json'),
  };
}

export function makeFormRoute(kind: SubmissionKind, formPath: string): APIRoute {
  return async ({ request, locals, redirect }) => {
    const { data, honeypotFilled, token, wantsJson } = await readPayload(request);
    const env = (locals as { runtime?: { env?: Env } }).runtime?.env;

    const result = await handleSubmission(kind, data, buildDeps(env), {
      honeypotFilled,
      turnstileToken: token,
      meta: {
        cfCountry: request.headers.get('cf-ipcountry') ?? undefined,
        userAgent: request.headers.get('user-agent') ?? undefined,
        ip: request.headers.get('cf-connecting-ip') ?? undefined,
      },
    });

    if (wantsJson) {
      return new Response(JSON.stringify(result.body), {
        status: result.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // No-JS path: 303 to /thanks on success, back to the form with ?error= otherwise.
    if (result.status === 200) return redirect('/thanks', 303);
    const message =
      result.body.message ?? 'Please check the highlighted fields and try again.';
    return redirect(`${formPath}?error=${encodeURIComponent(message)}`, 303);
  };
}
