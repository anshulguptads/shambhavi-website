# Dynamic Site — Design Spec

**Date:** 2026-07-18
**Status:** Approved (§1 architecture + §2 motion approved explicitly; §3–§5 delegated — user authorized full autonomous execution of Approach A)
**Branch state at writing:** `redesign/astro-v1` (Astro rebuild, not yet on `main`)

## Goal

Make shambhavilabs.com dynamic in three user-chosen senses, shipped incrementally on top of the Astro redesign:

1. **Motion & interactivity** — "full immersive" level (WebGL, scroll-driven storytelling, animated data viz), degrading gracefully.
2. **Runtime features** — a working **pilot/demo request form** and **contact form** (no newsletter, no search).
3. **Content without code** — founders (non-devs) publish journal posts and edit product pages from a browser.

Explicitly **not** wanted: per-request server rendering / personalization. The site stays static-first.

## Chosen approach (A): Cloudflare-native, git-centred

- Astro stays `output: 'static'`; add `@astrojs/cloudflare` adapter so *individual* routes can opt out of prerendering. Only `/api/*` (forms) and `/keystatic` (CMS admin) run on Workers; every public page remains pre-rendered on the CDN.
- Forms: Turnstile (spam) → D1 (durable lead log) → Resend (email to founders). All Cloudflare/free-tier.
- CMS: **Keystatic**, editing the existing MDX content collections in place. Publish = git commit → Cloudflare auto-build (~1 min). One source of truth (the repo).
- Rejected alternatives: hosted CMS (Sanity — second source of truth, migration, vendor limits) and full SSR (complexity the requirements don't need).

```
GitHub repo (MDX + code) ──push──▶ Cloudflare Pages build ──▶ static CDN ──▶ visitor
      ▲                                                            │
      │ publish = commit                                           │ form POST
Keystatic admin (/keystatic)                          Workers routes /api/demo-request, /api/contact
                                                        ├─ Turnstile verify
                                                        ├─ D1 insert (submissions)
                                                        └─ Resend → info@shambhavilabs.com
```

## §1 Architecture & phases

**Phases, each shipping to production independently:**

| Phase | Contents | Ships when |
|---|---|---|
| 0 | Redesign → `main` → production | build verified + legacy-URL parity checked |
| 1 | Motion & immersion | visual QA + perf/reduced-motion sweep pass |
| 2 | Forms (pilot request + contact) | unit + E2E tests pass locally; prod degrades gracefully until keys configured |
| 3 | Keystatic CMS | local-mode editing verified end-to-end; cloud-mode config documented |

**Hard external boundary (user account actions, ~10 min, documented in `docs/DYNAMIC-SETUP.md`):** create Resend API key + verify sending domain; create Turnstile widget; create D1 database + bind; set env vars in Cloudflare dashboard; create Keystatic Cloud project (or GitHub App). Wrangler is unauthenticated on this machine — all Cloudflare-side provisioning is the user's step. **All code degrades gracefully when a service is unconfigured** (see §3).

**New dependencies:** `gsap`, `three`, `lenis` (motion); `@astrojs/cloudflare`, `zod` (forms); `@keystatic/core`, `@keystatic/astro`, `@astrojs/react`, `react`, `react-dom` (CMS, admin route only); `vitest` (dev). Nothing else.

## §2 Motion & immersion ("full immersive")

**Tech:** GSAP + ScrollTrigger (scroll choreography), three.js (home-hero WebGL only, dynamically imported post-interactive), Astro `<ClientRouter />` view transitions, Lenis smooth scroll (desktop pointer-fine + non-reduced-motion only), hand-rolled SVG/canvas + GSAP for data viz. All islands; per-page JS only where used.

**Foundation (must land before any surface):**
- `src/lib/motion/` — capability tiering (`prefers-reduced-motion`, pointer type, `deviceMemory`, `saveData`, WebGL support probe) exposing a `motionTier()` ∈ {`static`, `lite`, `full`}; GSAP registration + cleanup helpers.
- View-transition lifecycle: **migrate every existing once-per-load `<script>`** (Header scroll swap, mobile menu, Reveal observer, hero pupil, ProductVisual observers) to idempotent `astro:page-load` handlers with `astro:before-swap` cleanup. This is a correctness prerequisite — without it, client-side navigation silently kills all existing behavior.
- Named view transitions: product card → product hero, journal card → post hero, persistent header.

**Surfaces:**
1. **Hero eye (home)** — three.js particle iris (~2–4k particles) forming the existing eye geometry: breathing drift, cursor gaze (whole iris, not just pupil), scroll dissolve into the pillars section. Fallback (`lite`/`static` tiers, WebGL failure, reduced motion): current SVG eye, untouched.
2. **Pillars scroll-story (home)** — the one pinned section: GSAP timeline assembles Learn → Work → Build in sequence with a progress rail; short (≤2.5 viewport-heights), skippable, fully bypassed in `lite`/`static` (falls back to current cards + Reveal).
3. **Product signature scenes** — upgrade each `ProductVisual` on its platform page to a scroll/hover-driven GSAP scene: AspiremsAI crisis-detection timeline (distress → "<2s" live counter → KIRAN surfaces → alerts fan out); NeuroLink draggable/hoverable Concept-DNA graph with weak-node pulse + dependency trace; SanaDeep 19-module constellation → grid snap with anomaly-caught ripple; InsightTest self-healing code panel (selector breaks red → DOM-signal scan → rewrites green → run continues). Home-page product cards keep the existing lighter CSS visuals.
4. **Animated proof points** — shared counter island: metrics count up on reveal with a sparkline/bar draw-in.
5. **Micro-interactions** — magnetic CTA buttons (pointer-fine only), card tilt + cursor-following accent glow, nav underline spring, animated form focus states, footer logo occasional blink.
6. **Ambient** — GradientOrb upgraded to a slow canvas gradient-mesh drift (`full` tier; CSS fallback), existing grain kept, gentle section parallax.
7. **Journal pages stay calm** — reveal + view transition only; zero motion JS beyond that.

**Guardrails (acceptance criteria):**
- Reduced-motion sweep: every surface has a static-equivalent; no pinning, no WebGL, no Lenis.
- three.js never loads on `lite`/`static` tiers or non-home pages; loaded via dynamic import after `astro:page-load` idle.
- Perf bar: LCP ≤ 2.5 s (mid-tier mobile emulation), CLS < 0.1, no long tasks before LCP from motion code, **0 console errors** site-wide.
- No scroll-jacking outside the pillars story; story is short and skippable.

## §3 Forms

**Pages & routing changes:**
- New `/request-pilot` — the conversion page. Product-aware: platform multi-select chips (AspiremsAI / NeuroLink / SanaDeep / InsightTest), preselected via `?platform=` from product-page CTAs; fields: name*, work email*, organisation*, role, organisation type (label adapts: school / university / company), country (default India), phone, message. Honeypot + invisible Turnstile.
- New `/contact` — simple: name*, email*, topic (Partnership / Press / Careers / Support / General / Parent or student), message*.
- New `/thanks` — no-JS success target.
- CTA rewiring: header CTA "Request a Pilot" → `/request-pilot`; hero "Request a demo" → `/request-pilot`; product-page CTAs → `/request-pilot?platform=<slug>`; `CtaSection` buttons → `/request-pilot` and `/contact`; nav "Contact" → `/contact`. Mailto remains as a visible fallback line.

**API routes** (`prerender = false`): `POST /api/demo-request`, `POST /api/contact`.
Pipeline: parse (form-encoded or JSON) → zod validate (shared schemas in `src/lib/forms/`) → honeypot (silently accept, discard) → Turnstile server verify *if configured* → D1 insert *if bound* → Resend email *if key present* (reply-to submitter, subject `[Pilot request] <platforms> — <org> (<name>)`) → respond (JSON for fetch; 303 → `/thanks` for no-JS).

**Degradation contract:** each integration is independently optional. Success = at least one of {D1 insert, email} succeeded; if both unavailable/failed → 503 with a human message + mailto fallback (client renders it inline; no-JS gets an error page with the same). Missing Turnstile config → skip verification, log warning (honeypot still active). This makes deploying Phase 2 *before* the user's key-setup safe.

**Data:** D1 table `submissions` (id, kind, created_at, name, email, organisation, role, platforms, org_type, country, phone, topic, message, email_sent, cf_country, user_agent). Migration SQL in `db/migrations/0001_submissions.sql`; applied via `wrangler d1 execute` (documented). Reviewing leads = email inbox + D1 console (an `/admin` viewer is explicitly out of scope).

**Client enhancement island:** intercept submit → fetch → inline pending/success/error states, double-submit guard; plain HTML POST works with JS off.

**Env/bindings:** `DB` (D1 binding), `RESEND_API_KEY`, `FORMS_TO` (default info@shambhavilabs.com), `FORMS_FROM`, `TURNSTILE_SECRET_KEY`, `PUBLIC_TURNSTILE_SITE_KEY`. Local dev via `platformProxy` (wrangler config gives a local D1); Turnstile official test keys in dev.

**Testing:** vitest unit tests for schema validation, email construction, and the handler pipeline (mocked D1/fetch/Resend — including each degradation branch); Playwright E2E locally: happy path (JS on), validation errors, no-JS POST → `/thanks`, unconfigured-503 fallback rendering.

## §4 CMS (Keystatic)

- Admin at `/keystatic` (React island route, `noindex`, excluded from sitemap; served by the same Workers runtime as the API routes).
- **Storage modes:** `local` in dev (edits working-tree files — how we verify end-to-end now). Production: **Keystatic Cloud** (founders log in without GitHub accounts; free tier) — config is cloud-ready behind env (`KEYSTATIC_STORAGE=cloud` + project slug); GitHub-App mode documented as the alternative. Creating the Cloud project is a user step (setup doc).
- **Collections mapped 1:1 to existing content** (no schema migration): `journal` ↔ `src/content/blog/*.mdx` (title, description, publishDate, tags, category, hero image, draft, featured, eyebrow, MDX body); `products` ↔ `src/content/products/*.mdx` (full frontmatter incl. keyCapabilities/outcomes/proofPoints arrays, MDX body).
- Publish flow: edit → Publish → commit → Pages build → live ≈ 1 min. Drafts: existing `draft` flag (already excluded from listings/build).
- Accepted risk: Keystatic normalizes frontmatter formatting on first save of each file (content-preserving; verified on a real post during implementation).
- `src/lib/site.ts` (nav, founders) stays code — deliberately not CMS-managed.

## §5 Rollout, verification, ops

**Phase 0 specifics:** verify the 3 old-site blog posts (commit `06e0dd0`) are content-covered by the MDX essays **and that old slugs 301 correctly** (`_redirects` maps `/blog/:slug` → `/journal/:slug`; if old slugs ≠ new MDX slugs, add explicit per-slug redirects). Merge = `git merge -s ours origin/main` from `redesign/astro-v1` (records history, keeps redesign tree exactly), fast-forward `main`, push, then verify production serves the Astro site (fetch + marker check). If Pages isn't actually wired to `main`, report with evidence — dashboard access is a user boundary.

**Every phase:** feature branch → build + tests + Playwright sweep (desktop/mobile viewports, console-error check, reduced-motion pass) → merge `main` → push → verify prod URL.

**Ops docs:** `docs/DYNAMIC-SETUP.md` (the ~10-min key/bindings setup, D1 migration command, Keystatic Cloud setup, how to read leads); README updated (new scripts, env vars, editing workflow).

**Out of scope (recorded for later):** newsletter, site search, leads admin UI, CMS-managed nav/site config, analytics.
