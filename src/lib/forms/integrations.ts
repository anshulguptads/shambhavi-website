/**
 * Real integrations, built from whatever the environment actually provides.
 * Each member of FormDeps is included only when its config exists — the
 * pipeline in handle.ts treats absence as "skip gracefully".
 */
import type { FormDeps, SubmissionMeta } from './handle';
import type { Submission } from './schema';

const DEFAULT_TO = 'info@shambhavilabs.com';
// Unverified-domain-safe default sender; replace via FORMS_FROM once
// shambhavilabs.com is verified in Resend (see docs/DYNAMIC-SETUP.md).
const DEFAULT_FROM = 'Shambhavi Website <onboarding@resend.dev>';

export function buildDeps(env: Env | undefined): FormDeps {
  const deps: FormDeps = {};
  if (!env) return deps;

  if (env.TURNSTILE_SECRET_KEY) {
    const secret = env.TURNSTILE_SECRET_KEY;
    deps.verifyTurnstile = async (token, ip) => {
      if (!token) return false;
      const form = new FormData();
      form.append('secret', secret);
      form.append('response', token);
      if (ip) form.append('remoteip', ip);
      const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: form,
      });
      if (!res.ok) return false;
      const data = (await res.json()) as { success?: boolean };
      return data.success === true;
    };
  }

  if (env.DB) {
    const db = env.DB;
    deps.insertRow = async (s, meta, emailSent) => {
      await db
        .prepare(
          `INSERT INTO submissions
            (id, kind, name, email, organisation, role, platforms, org_type, country, phone, topic, message, email_sent, cf_country, user_agent)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)`
        )
        .bind(
          crypto.randomUUID(),
          s.kind,
          s.name,
          s.email,
          'organisation' in s ? s.organisation : null,
          ('role' in s ? s.role : undefined) ?? null,
          'platforms' in s ? s.platforms.join(',') : null,
          ('orgType' in s ? s.orgType : undefined) ?? null,
          ('country' in s ? s.country : undefined) ?? null,
          ('phone' in s ? s.phone : undefined) ?? null,
          'topic' in s ? s.topic : null,
          s.message ?? null,
          emailSent ? 1 : 0,
          meta.cfCountry ?? null,
          meta.userAgent ?? null
        )
        .run();
    };
  }

  if (env.RESEND_API_KEY) {
    const key = env.RESEND_API_KEY;
    const to = env.FORMS_TO || DEFAULT_TO;
    const from = env.FORMS_FROM || DEFAULT_FROM;
    deps.sendEmail = async (s, meta) => {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to: [to],
          reply_to: s.email,
          subject: buildSubject(s),
          text: buildBody(s, meta),
        }),
      });
      if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
    };
  }

  return deps;
}

export function buildSubject(s: Submission): string {
  if (s.kind === 'demo-request') {
    return `[Pilot request] ${s.platforms.join(' + ')} — ${s.organisation} (${s.name})`;
  }
  return `[Contact] ${s.topic} — ${s.name}`;
}

export function buildBody(s: Submission, meta: SubmissionMeta): string {
  const lines: string[] = [];
  if (s.kind === 'demo-request') {
    lines.push(
      `New pilot/demo request`,
      ``,
      `Platform(s):   ${s.platforms.join(', ')}`,
      `Name:          ${s.name}`,
      `Email:         ${s.email}`,
      `Organisation:  ${s.organisation}`,
      s.role ? `Role:          ${s.role}` : '',
      s.orgType ? `Org type:      ${s.orgType}` : '',
      s.country ? `Country:       ${s.country}` : '',
      s.phone ? `Phone:         ${s.phone}` : ''
    );
  } else {
    lines.push(`New contact message`, ``, `Topic:  ${s.topic}`, `Name:   ${s.name}`, `Email:  ${s.email}`);
  }
  if (s.message) lines.push(``, `Message:`, s.message);
  lines.push(``, `—`, `via shambhavilabs.com${meta.cfCountry ? ` · ${meta.cfCountry}` : ''}`);
  return lines.filter((l) => l !== '').join('\n');
}
