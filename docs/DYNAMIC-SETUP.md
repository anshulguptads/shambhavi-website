# Dynamic features — one-time setup (~10 minutes)

The site's forms and CMS are **live and safe today** but run in degraded mode
until these account-level steps are done. Each step independently unlocks its
feature — do them in any order. Everything here needs *your* Cloudflare /
Resend / Keystatic accounts, which is why it isn't automated.

**Current behavior without setup:** form submissions return a friendly
"email us at info@shambhavilabs.com" message (nothing is silently lost);
`/keystatic` isn't usable in production yet.

---

## 0. Activate the server side — one dashboard field (~1 min)

Production currently deploys **static assets only** (the dashboard's Workers
Builds deploy command dates from the static-site era, and a repo wrangler
config file conflicts with it — builds fail if one exists). The form pages
render, but `/api/*` and `/keystatic` need the Astro worker deployed.

Cloudflare dashboard → Workers & Pages → **shambhavi-website** → Settings →
**Build** → Deploy command, change it to:

```
npx wrangler deploy --config cloudflare.worker.jsonc
```

[cloudflare.worker.jsonc](../cloudflare.worker.jsonc) is ready in the repo
(worker + assets + nodejs_compat). Retry the latest deployment after saving.
While you're in that screen, note the **build log** of any failed deploy —
if the command above errors, the log will say exactly why.

## 1. D1 database — durable lead storage (~3 min)

```bash
npx wrangler login                     # opens browser; use the Cloudflare account that owns the Pages project
npx wrangler d1 create shambhavi-forms
```

Copy the printed `database_id` into [wrangler.jsonc](../wrangler.jsonc) —
uncomment the `d1_databases` block in **cloudflare.worker.jsonc** and paste the id — then create the table:

```bash
npx wrangler d1 execute shambhavi-forms --remote --file db/migrations/0001_submissions.sql
```

Commit + push the cloudflare.worker.jsonc change — that's the binding. (With
config-file deploys, bindings live in the config, not the dashboard;
dashboard-added bindings would be overwritten on the next deploy.)

**Reading leads later:**
```bash
npx wrangler d1 execute shambhavi-forms --remote --command "SELECT created_at, kind, name, email, organisation, platforms, topic FROM submissions ORDER BY created_at DESC LIMIT 50"
```

## 2. Resend — instant email notifications (~4 min)

1. Create a free account at resend.com (100 emails/day — plenty).
2. **Verify the domain** `shambhavilabs.com` (Resend → Domains → Add — it
   gives you 3 DNS records; add them in Cloudflare DNS, verification takes
   ~2 min).
3. Create an API key (Sending access only).
4. Cloudflare dashboard → Workers & Pages → shambhavi-website → Settings →
   Variables and Secrets → add as type **Secret** (secrets survive deploys):
   - `RESEND_API_KEY` = `re_…`
   - `FORMS_FROM` = `Shambhavi Website <forms@shambhavilabs.com>`
   - `FORMS_TO` = `info@shambhavilabs.com` (optional — this is the default)

Until the domain verifies you can skip `FORMS_FROM`; the code falls back to
Resend's `onboarding@resend.dev` sender (fine for testing, spammy for real use).

## 3. Turnstile — invisible spam protection (~2 min)

1. Cloudflare dashboard → Turnstile → Add site → domain `shambhavilabs.com`,
   widget mode **Invisible**.
2. Two places (they serve different stages):
   - `TURNSTILE_SECRET_KEY` = the secret key → Settings → Variables and
     Secrets, type **Secret** (runtime).
   - `PUBLIC_TURNSTILE_SITE_KEY` = the site key → Settings → **Build** →
     Build variables (it's baked into the HTML at build time).
3. Redeploy (retry the latest build, or push anything) — the widget only
   renders when the public key exists at build time.

Until then, the honeypot field is the (already active) spam guard.

## 4. Keystatic Cloud — CMS login for founders (~3 min)

1. Create a (free) team at keystatic.cloud, add a project pointed at the
   `anshulguptads/shambhavi-website` GitHub repo, default branch `main`.
2. Note the project key (`team-slug/project-slug`).
3. Settings → **Build** → Build variables (these are build-time):
   - `KEYSTATIC_STORAGE` = `cloud`
   - `KEYSTATIC_PROJECT` = `team-slug/project-slug`
4. Push/redeploy. Founders then sign in at `shambhavilabs.com/keystatic`
   (invite them to the Keystatic Cloud team — no GitHub accounts needed).
   Publishing an edit commits to `main` → the site auto-deploys in ~1 min.

*Alternative (no Keystatic Cloud): GitHub mode — create a GitHub App via
`npx keystatic github setup` and set its four env vars instead. Cloud mode
is simpler; use GitHub mode only if you outgrow the free tier.*

## Sanity checklist when done

- Submit the form at `/request-pilot` → success panel, email arrives,
  row visible via the `wrangler d1 execute … SELECT` above.
- `/keystatic` shows the sign-in screen and lists Journal + Products after login.
- Turnstile: the form still submits normally (invisible widget), and
  obviously-botty repeated POSTs without tokens get 403s.
