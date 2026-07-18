# Dynamic Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Execution note (2026-07-18):** user delegated full autonomous delivery; executing inline via superpowers:executing-plans in-session. Each phase = its own branch off `main`, merged + pushed + prod-verified before the next begins. Working in the primary checkout (clean tree, sequential phases) instead of a worktree.

**Goal:** Ship the Astro redesign to production, then make it dynamic in three shipped increments: full-immersive motion, working pilot/contact forms (Turnstile→D1→Resend), and Keystatic CMS for founders.

**Architecture:** Static-first Astro 5 + `@astrojs/cloudflare` adapter; only `/api/*` and `/keystatic` run on Workers. Motion is Astro-island based (GSAP/three.js/Lenis) gated by a capability tier. Forms degrade gracefully per-integration (each of Turnstile/D1/Resend independently optional). CMS edits the existing MDX collections in place via git commits.

**Tech Stack:** Astro 5, Tailwind, GSAP + ScrollTrigger, three.js, Lenis, zod, Cloudflare D1/Turnstile/Pages, Resend, Keystatic (+React admin route), vitest, Playwright MCP for visual verification.

**Spec:** `docs/superpowers/specs/2026-07-18-dynamic-site-design.md`

## Global Constraints

- Public pages stay prerendered — `output: 'static'`; only API routes + `/keystatic` set `prerender = false`.
- Perf bar (every phase): LCP ≤ 2.5 s mid-mobile, CLS < 0.1, **0 console errors**, no long tasks before LCP from motion code.
- Every motion surface has a reduced-motion/`lite`-tier static equivalent; three.js only on home, dynamic-imported post-load.
- All form integrations optional at runtime: missing Turnstile → skip+warn (honeypot stays); success = D1 insert OR email sent; neither → 503 + mailto fallback. Deploying before user's key setup must be safe.
- No new deps beyond: gsap, three, lenis, @astrojs/cloudflare, zod, @keystatic/core, @keystatic/astro, @astrojs/react, react, react-dom, vitest (dev), @types/three (dev).
- Content collections schemas unchanged (CMS maps onto them 1:1).
- Existing visual language (tokens in `tailwind.config.mjs`, `src/styles/global.css`) is the palette for all new visuals; commit style follows repo history (imperative, no prefix); Co-Authored-By Claude trailer.
- User-account boundary: wrangler unauthenticated → D1 creation, Turnstile widget, Resend key, CF env vars, Keystatic Cloud project are documented user steps (`docs/DYNAMIC-SETUP.md`), never blockers for code tasks.

---

## Phase 0 — Ship the redesign

### Task 0.1: Verify, merge `redesign/astro-v1` → `main`, deploy

**Files:**
- Modify (only if slugs mismatch): `public/_redirects`

**Interfaces:**
- Produces: production serves the Astro site from `main`; all later phases branch off `main`.

- [ ] **Step 1: Clean build check** — Run: `npm run build`. Expected: exit 0, all routes emitted to `dist/` (index, about, solutions, 4 platform pages, journal index + 4 posts, 404, rss.xml, sitemap).
- [ ] **Step 2: Legacy blog-slug parity** — Run: `git show 06e0dd0 --name-only --format=""` and list `src/content/blog/*.mdx`. Old URLs are `/blog/<old-slug>/`; `_redirects` maps `/blog/:slug` → `/journal/:slug`. For any old slug ≠ MDX slug, append explicit lines to `public/_redirects` (e.g. `/blog/<old-slug> /journal/<new-slug> 301` and the trailing-slash variant **above** the generic `/blog/:slug` rules — first match wins on CF Pages). Also confirm the 3 posts exist as MDX (title-level check). Commit if changed: `git add public/_redirects && git commit -m "Redirect legacy blog slugs to journal equivalents"`.
- [ ] **Step 3: Local smoke** — Run `npm run preview` (background) + Playwright: load `/`, `/platforms/aspirems`, `/journal`, one post; assert 0 console errors; screenshot home. Stop preview.
- [ ] **Step 4: Merge keeping redesign tree exactly**

```bash
git fetch origin
git checkout redesign/astro-v1
git merge -s ours origin/main -m "Merge main into redesign (old static site superseded by Astro rebuild; content ported to MDX)"
git checkout main && git pull --ff-only origin main
git merge --ff-only redesign/astro-v1
git push origin main
```

- [ ] **Step 5: Verify production** — Wait ~90 s; fetch `https://shambhavilabs.com` and assert an Astro marker (`/_assets/` asset path) + fetch one legacy URL `/aspirems.html` → 301 to `/platforms/aspirems`. If prod still serves the old site after ~5 min, capture evidence and continue (Pages wiring = user boundary; report at end).

---

## Phase 1 — Motion & immersion (branch `feat/motion` off `main`)

**Shared interfaces created in Task 1.1 and consumed by all later motion tasks:**

```ts
// src/lib/motion/tier.ts
export type MotionTier = 'static' | 'lite' | 'full';
export function motionTier(): MotionTier;
// 'static'  → prefers-reduced-motion
// 'lite'    → saveData, deviceMemory < 4, coarse pointer + small viewport, or no WebGL2
// 'full'    → everything else
export function onTierAtLeast(tier: MotionTier, fn: () => void | (() => void)): void;

// src/lib/motion/lifecycle.ts  — the ClientRouter-safe script pattern
export function onPageReady(fn: () => void | (() => void)): void;
// runs fn on astro:page-load (fires on first load AND after each client-side nav);
// if fn returns a cleanup, it runs on astro:before-swap. Module-level listeners added once.

// src/lib/motion/gsap.ts
export async function withGsap(fn: (gsap: GSAP, ScrollTrigger: typeof ScrollTrigger) => void | (() => void)): Promise<void>;
// dynamic-imports gsap + ScrollTrigger once, registers plugin, wires cleanup via onPageReady semantics
```

### Task 1.1: Foundation — deps, tier module, lifecycle, ClientRouter migration

**Files:**
- Create: `src/lib/motion/tier.ts`, `src/lib/motion/lifecycle.ts`, `src/lib/motion/gsap.ts`
- Modify: `package.json` (deps), `src/layouts/BaseLayout.astro` (add `<ClientRouter />`), `src/components/layout/Header.astro`, `src/components/motion/Reveal.astro`, `src/components/sections/Hero.astro` (pupil script), `src/components/sections/ProductVisual.astro` — migrate every `<script>` to `onPageReady` idempotent pattern
- Test: Playwright — client-side nav between `/` ↔ `/about` ↔ `/platforms/aspirems`; header scroll-swap, reveals, mobile menu, product visuals all still function after nav; 0 console errors.

**Steps:** (1) `npm i gsap lenis three && npm i -D @types/three`. (2) Implement the three lib files to the interfaces above (complete code written at implementation; `onPageReady` pattern: module-scope `document.addEventListener('astro:page-load', …)` + cleanup registry flushed on `astro:before-swap`; guard double-registration via `import.meta` module semantics). (3) Add `<ClientRouter />` from `astro:transitions` to BaseLayout head. (4) Migrate each existing script: top-level DOM queries move inside the handler; listeners on `window`/`document` registered once at module level with current-element lookup, or re-bound per page with cleanup. Header also re-syncs `data-mode` from `document.body.dataset.headerMode` on each page-load (set `data-header-mode` on body via PageLayout prop) and gets `transition:persist="site-header"`. (5) Build + Playwright verification. (6) Commit.

### Task 1.2: View-transition names

**Files:** Modify: `src/components/sections/ProductsGrid.astro` (card root: `transition:name={`product-${slug}`}`), `src/components/sections/ProductHero.astro` (matching name), `src/pages/journal/index.astro` (card title/hero: `post-${slug}`), `src/layouts/PostLayout.astro` (matching), `src/styles/global.css` (respect reduced-motion: `@media (prefers-reduced-motion: reduce) { ::view-transition-group(*) … animation: none }`).

**Steps:** implement → Playwright: navigate home → product page, journal → post; observe morph (screenshot before/after), reduced-motion emulation shows no morph → commit.

### Task 1.3: WebGL hero eye (home)

**Files:**
- Create: `src/components/scenes/HeroEyeGL.astro` (canvas + inline module script, dynamic `import('three')` gated `motionTier() === 'full'` + `requestIdleCallback`)
- Modify: `src/components/sections/Hero.astro` (mount canvas absolutely over the SVG; SVG remains the fallback and the loading state; when GL scene reports ready, fade SVG→canvas)

**Behavior contract:** ~3k `THREE.Points` sampled from the existing eye geometry (outline path + iris disc, saffron gradient palette `#f5b556→#b87627`, cream lattice accents); idle = slow orbital drift + breathing scale (gsap ticker); pointer = iris group eases toward cursor direction (max ~6° tilt, replicating pupil logic); scroll (ScrollTrigger, hero as trigger) = particles disperse downward with opacity fade, fully dissolved by pillars top. Cleanup disposes renderer/geometry on `astro:before-swap`. Failure/timeout (>4 s) → SVG stays, no error surfaced.

**Steps:** implement → verify tiers via Playwright (`full`: canvas active; emulate reduced-motion: SVG only; block WebGL via CDP flag: SVG only) → perf: three.js chunk lazy (network tab shows post-load fetch) → commit.

### Task 1.4: Pillars scroll-story (home)

**Files:** Create `src/components/scenes/PillarsStory.astro`; Modify `src/components/sections/Pillars.astro` (wrap: `full` tier gets pinned story, otherwise existing grid unchanged — both markup paths server-rendered, story activates via JS only).

**Behavior contract:** ScrollTrigger pin over ≈2.2 viewport-heights; timeline: pillar 01 card scales/fades in + its number draws + product names slide up → handoff → 02 → 03; left progress rail (3 dots + fill line) synced to timeline progress; `end` releases pin cleanly (no CLS — pin-spacer natural). Keyboard/scroll-fast users: nothing blocks; story is passive (scrubbed, `scrub: 0.8`).

**Steps:** implement → Playwright scroll capture at 4 scroll positions + reduced-motion pass (plain grid) → commit.

### Task 1.5: Product signature scenes + proof-point counters

**Files:**
- Create: `src/components/scenes/CrisisTimeline.astro` (aspirems), `src/components/scenes/ConceptGraph.astro` (neurolink), `src/components/scenes/ModuleConstellation.astro` (sanadeep), `src/components/scenes/SelfHealDemo.astro` (insighttest), `src/components/scenes/ProofCounter.astro` (shared count-up + sparkline)
- Modify: `src/components/sections/ProductHero.astro` / platform pages (`src/pages/platforms/*.astro`) to mount scenes; `src/components/sections/ProductVisual.astro` untouched for home-page cards; proof-point rows swap static metrics for `ProofCounter`.

**Behavior contracts (each scene: SVG/DOM + GSAP scrubbed timeline; `lite`/`static` → current CSS visual or final-frame static):**
- *CrisisTimeline:* 4 beats scrubbed — student message w/ distress phrase highlight → detection pulse + live `<2s` stopwatch counting 0.0→1.8 s → KIRAN helpline card slides over chat → counsellor+admin alert chips fan out; timeline rail with beat labels.
- *ConceptGraph:* force-free precomputed layout (~14 nodes, existing 6 + 8 more concepts); scroll = edges draw + nodes pop by dependency depth; pointer: hover highlights node + neighbors (others dim), drag node with springy edges (pointer events + gsap inertia-ish easing, no physics lib); one node ("Backprop") pulses red on scroll-in, dependency path back to "Calculus" traces in maroon.
- *ModuleConstellation:* 19 module chips (full SanaDeep module list from product MDX) start scattered on orbital rings (deterministic pseudo-random from index), slow drift; scroll = converge/snap into 5×4 grid (one cell = "+ your country" tile); after snap, saffron anomaly ripple crosses grid, "Payroll anomaly caught" chip pops on the Payroll cell.
- *SelfHealDemo:* code panel (`<pre>`, hand-tokenized spans, no highlight lib) with test selector line; scrub: run dot advances → selector flashes red `✗ .btn-submit not found` → scan overlay sweeps DOM tree mini-map (visual/semantic/positional badges light up) → selector text rewrites to `[data-testid=submit]` green ✓ → run continues, pass count ticks up.
- *ProofCounter:* on reveal, number counts from 0 (or `<2s` counts 3.0→2.0 style downward where semantic), suffix/prefix preserved from data; 24×h sparkline path draws in behind; reduced-motion = final values immediately.

**Steps per scene:** implement → Playwright screenshots at 3 scroll positions on that platform page + hover/drag spot-check (ConceptGraph) + reduced-motion pass → commit (one commit per scene is fine; counters + first scene may share).

### Task 1.6: Micro-interactions, ambient layer, Lenis

**Files:**
- Create: `src/lib/motion/interactions.ts` (magnetic + tilt/glow initializers), `src/components/motion/GradientMesh.astro`
- Modify: `src/components/ui/Button.astro` (add `data-magnetic` on primary/lg), card components in `ProductsGrid.astro`/`Pillars.astro` (`data-tilt`), `src/components/layout/Header.astro` (nav underline spring via gsap on `.hdr-link`), `src/components/layout/Footer.astro` (logo blink CSS animation, ~9 s interval, 2 frames), `src/components/motion/GradientOrb.astro` → render `GradientMesh` canvas when `full` (CSS orb fallback inline), `src/layouts/BaseLayout.astro` or `PageLayout` (Lenis init: desktop pointer-fine + `full`/`lite`? → **full only**, synced to ScrollTrigger via `lenis.on('scroll', ScrollTrigger.update)` + gsap ticker driving `lenis.raf`).

**Behavior:** magnetic = button eases toward cursor within 28 px radius, spring-back on leave (translate ≤ 6 px — subtle); tilt = max 3.5° rotateX/Y + accent radial glow following cursor via CSS vars; underline = scaleX spring on hover/active driven by gsap; GradientMesh = 3–4 blurred radial blobs on offscreen-scaled canvas drifting via simplex-free sin/cos fields (60 fps cheap), palette from existing orb colors.

**Steps:** implement → Playwright hover/scroll captures + touch emulation (no magnetic/tilt) + reduced-motion (no Lenis, no mesh) + 0 console errors → commit.

### Task 1.7: Perf + a11y sweep → ship Phase 1

**Steps:** (1) `npm run build`; inspect `dist/_assets` chunk sizes — three.js chunk only referenced by home, gsap chunk shared, journal post pages reference no motion chunks beyond lifecycle (<3 KB). (2) Playwright sweep: all 10 routes × {desktop, 375px mobile} × {default, reduced-motion} — console clean, screenshots archived to scratchpad, CLS spot-check (layout stable across pin sections). (3) Mobile CPU-throttled load of `/` — LCP element = hero heading (not canvas), ≤ 2.5 s. (4) Fix regressions found. (5) Merge → `main` → push → verify prod (marker + one screenshot). Commit messages per repo style.

---

## Phase 2 — Forms (branch `feat/forms` off `main`)

**Shared interfaces (created 2.2/2.3, consumed by routes + UI):**

```ts
// src/lib/forms/schema.ts
export const demoRequestSchema: z.ZodType<DemoRequest>;  // kind:'demo-request'
export const contactSchema: z.ZodType<Contact>;          // kind:'contact'
export type Submission = DemoRequest | Contact;
export function parseSubmission(kind: 'demo-request'|'contact', data: FormData | unknown): Result<Submission, FieldErrors>;

// src/lib/forms/handle.ts
export interface FormDeps { verifyTurnstile?: (token: string, ip?: string) => Promise<boolean>; insertRow?: (s: Submission, meta: Meta) => Promise<void>; sendEmail?: (s: Submission, meta: Meta) => Promise<void>; }
export type HandleResult = { status: 200 | 400 | 403 | 503; body: { ok: boolean; errors?: FieldErrors; message?: string } };
export async function handleSubmission(kind, raw: FormData|unknown, deps: FormDeps, opts: { honeypotFilled: boolean; turnstileToken?: string }): Promise<HandleResult>;

// src/lib/forms/integrations.ts — real deps built from Astro.locals.runtime.env
export function buildDeps(env: CloudflareEnv): FormDeps; // omits members whose config is absent
```

### Task 2.1: Adapter + local platform + vitest scaffold
**Files:** Modify `astro.config.mjs` (`adapter: cloudflare({ platformProxy: { enabled: true } })`), `package.json` (scripts: `test: vitest run`, `test:watch`), Create `wrangler.jsonc` (name, `compatibility_date`, `pages_build_output_dir: "./dist"`, `d1_databases: [{ binding: "DB", database_name: "shambhavi-forms", database_id: "REPLACE-AFTER-CREATE", preview_database_id: "local" }]`), `db/migrations/0001_submissions.sql` (full CREATE TABLE from spec §3), `src/env.d.ts` runtime typing. `.gitignore` += `.wrangler`.
**Steps:** install (`npm i @astrojs/cloudflare zod && npm i -D vitest`) → `npm run build` still green (no route opted out yet) → commit.

### Task 2.2: Schemas (TDD)
**Test first** (`src/lib/forms/schema.test.ts`): valid demo request parses; missing name/email/organisation → field errors; bad email rejected; platforms must be non-empty subset of 4 slugs; contact requires message+topic enum; FormData and JSON inputs both parse; unknown fields stripped. Run red → implement `schema.ts` → green → commit.

### Task 2.3: Handler pipeline (TDD)
**Test first** (`src/lib/forms/handle.test.ts`) — degradation matrix: honeypot → 200 ok (no deps called); invalid → 400 with errors; turnstile dep present + fails → 403; D1 ok + email ok → 200; D1 ok + email throws → 200 (flag logged); D1 throws + email ok → 200; both absent/throw → 503 with mailto message; turnstile absent → proceeds (warn). Run red → implement `handle.ts` (+ `integrations.ts` with real Turnstile fetch, D1 insert SQL, Resend fetch — unit-tested via injected fakes only) → green → commit.

### Task 2.4: API routes
**Files:** Create `src/pages/api/demo-request.ts`, `src/pages/api/contact.ts` — `export const prerender = false`; thin: read request (form-encoded or JSON), pull token + honeypot field, `buildDeps(locals.runtime.env)`, call `handleSubmission`, respond JSON or 303 `/thanks` (Accept/content-type sniff). **Steps:** build → `npm run dev` + `curl` both routes (JSON + form-encoded; expect 200 with local D1 insert, email absent → still 200; row visible via `wrangler d1 execute shambhavi-forms --local --command "select * from submissions"`) → commit.

### Task 2.5: Form UI + pages
**Files:** Create `src/components/forms/Field.astro`, `TextArea.astro`, `Select.astro`, `PlatformChips.astro`, `Turnstile.astro` (renders only when `PUBLIC_TURNSTILE_SITE_KEY` set), `FormEnhance.astro` (island: fetch submit, pending/success/error inline states, double-submit guard), `src/pages/request-pilot.astro`, `src/pages/contact.astro`, `src/pages/thanks.astro`. Design: dark navy form panels consistent with CtaSection; animated focus states (Phase 1 interactions apply); platform chips preselect from `?platform=`; org-type label adapts to chip selection (school/university/company) via tiny inline script.
**Steps:** implement → Playwright: happy path with JS (local D1 row + success state), validation errors inline, JS-off POST → `/thanks`, 503 path (dev override env flag) shows mailto fallback → commit.

### Task 2.6: CTA rewiring
**Files:** Modify `src/lib/site.ts` (nav.cta.href → `/request-pilot`; nav.primary Contact → `/contact`), `Hero.astro` (Request a demo → `/request-pilot`), `CtaSection.astro` (primary → `/request-pilot`, secondary → `/contact`, keep mailto line), `ProductHero.astro`/platform pages CTAs → `/request-pilot?platform=<slug>`, `Footer.astro` company Contact link → `/contact`.
**Steps:** grep for `mailto:` + `#contact` to catch stragglers → Playwright click-through from header/hero/product/footer → commit.

### Task 2.7: E2E + ship Phase 2
**Steps:** full vitest run green → build → Playwright sweep of new pages (desktop/mobile/reduced-motion/console) → write `docs/DYNAMIC-SETUP.md` (Resend key + domain verify; Turnstile widget; `wrangler d1 create shambhavi-forms` + paste id into wrangler.jsonc + `wrangler d1 execute … --remote --file db/migrations/0001_submissions.sql`; CF Pages env vars list; how to read leads) → README update → merge → push → verify prod: `/request-pilot` renders; POST returns 503-with-mailto (expected pre-setup) — capture as evidence, not failure.

---

## Phase 3 — CMS (branch `feat/cms` off `main`)

### Task 3.1: Keystatic install + config
**Files:** Create `keystatic.config.ts` (storage: `local` when `!import.meta.env.KEYSTATIC_STORAGE`, `cloud` with `project: KEYSTATIC_PROJECT` otherwise; collections `journal` + `products` mapped field-for-field to `src/content/config.ts` schemas — arrays via `fields.array(fields.object(…))`, body `fields.mdx({ … images to src/assets/images/<collection> })`), Modify `astro.config.mjs` (add `react()` + `keystatic()`), `package.json`. Ensure `/keystatic` noindexed (integration default) + excluded from sitemap (`sitemap({ filter })`).
**Steps:** install (`npm i @keystatic/core @keystatic/astro @astrojs/react react react-dom`) → `npm run dev` → `/keystatic` loads → build still green (admin route server-rendered, public pages prerendered — check `dist` page count unchanged) → commit.

### Task 3.2: End-to-end local edit verification
**Steps:** Playwright: open `/keystatic` → journal collection lists 4 posts → create draft post "CMS smoke test" (draft: true) → file appears under `src/content/blog/`, frontmatter matches schema, `npm run build` green, post absent from `/journal` (draft) → edit one real post trivially (round-trip formatting check via git diff — content-preserving) → revert smoke artifacts (`git checkout -- src/content/blog` / delete new file) → commit config fixes if any surfaced.

### Task 3.3: Cloud-readiness + ship
**Steps:** document Keystatic Cloud setup (create project → set `KEYSTATIC_STORAGE=cloud`, `KEYSTATIC_PROJECT=<team/project>` in CF build env) + GitHub-mode alternative in `docs/DYNAMIC-SETUP.md` → README editing-workflow section rewrite (founders: shambhavilabs.com/keystatic) → merge → push → verify prod `/keystatic` responds (login screen or config notice pre-setup = expected) → final commit.

---

## Final — verification sweep + report

- [ ] Full: `npm run test` green; `npm run build` green; Playwright sweep all routes × viewports × motion prefs; console clean; legacy redirects live; forms degradation verified in prod; screenshots archived.
- [ ] Report to user: what shipped per phase, prod URLs, evidence, and the exact `DYNAMIC-SETUP.md` steps that unlock forms email/D1 + CMS login (the only human steps).

## Self-review (done at write time)

- **Spec coverage:** §1 phases → Tasks 0.1/1.x/2.x/3.x; §2 surfaces 1–7 → 1.3/1.4/1.5/1.6 + journal-calm honored (1.7 sweep asserts no motion JS on posts); §3 pipeline/degradation/pages/rewiring/tests → 2.2–2.7; §4 → 3.1–3.3; §5 rollout/setup doc → 0.1/1.7/2.7/3.3. Gap check: sitemap exclusion for /keystatic ✓ (3.1), body data-header-mode for persisted header ✓ (1.1), old-slug redirects ✓ (0.1).
- **Placeholders:** behavior contracts are complete and testable; creative code intentionally specified as contract + verification rather than pre-written listings (visual work is iterated against Playwright evidence, per execution note).
- **Type consistency:** `motionTier`/`onPageReady`/`withGsap` names used consistently across 1.1–1.6; `handleSubmission`/`buildDeps`/`parseSubmission` across 2.2–2.5.
