# Shambhavi Innovation Lab

AI-native software for how India learns, works, and builds.

**Live site:** https://shambhavilabs.com

The source code for the Shambhavi Innovation Lab marketing website. Built with
[Astro](https://astro.build), Tailwind CSS, and MDX. Deployed via Cloudflare Pages.

---

## Quick start

```bash
npm install        # install dependencies
npm run dev        # start dev server at http://localhost:4321
npm run build      # build for production → dist/
npm run preview    # preview the production build locally
```

Requires Node.js ≥ 18. Node 22 recommended.

## Project structure

```
src/
├── pages/                    # file-based routes
│   ├── index.astro           # /
│   ├── about.astro           # /about
│   ├── 404.astro
│   ├── rss.xml.ts            # /rss.xml (auto-generated feed)
│   ├── platforms/
│   │   └── [slug].astro      # /platforms/aspirems, /neurolink, etc.
│   └── journal/
│       ├── index.astro       # /journal
│       └── [slug].astro      # /journal/<post-slug>
├── layouts/                  # BaseLayout, PageLayout, PostLayout
├── components/
│   ├── layout/               # Header, Footer
│   ├── sections/             # Hero, Pillars, ProductsGrid, etc.
│   ├── ui/                   # Button, Pill, Eyebrow
│   └── motion/               # Reveal, GradientOrb
├── content/
│   ├── config.ts             # content-collection schemas
│   ├── blog/                 # *.mdx essays (Git-based CMS)
│   └── products/             # *.json product data
├── lib/                      # site config, SEO helpers
└── styles/global.css
public/
├── images/                   # founder photos, etc.
├── og-*.png                  # Open Graph images
├── _redirects                # CF Pages 301s from legacy .html URLs
├── robots.txt
├── favicon.svg
└── manifest.webmanifest
```

## Writing a new blog post

1. Create `src/content/blog/<slug>.mdx`
2. Include frontmatter:

   ```mdx
   ---
   title: "Your title"
   description: "Short summary shown in listings and social previews"
   publishDate: 2026-04-20
   author: "Shambhavi Innovation Lab"
   category: "Company"
   tags: ["AI", "India"]
   readingTime: "5 min read"
   featured: false
   ---

   Your MDX content here. Use Markdown + any Astro / React components.
   ```

3. `git commit` + `git push`. Cloudflare Pages auto-deploys in ~30 seconds.
4. Post auto-appears on `/journal` and in `/rss.xml`.

Set `draft: true` to hide a post from listings during writing.

## Editing a platform page

Platform pages are data-driven — no code changes needed for content updates.

Edit the relevant JSON file:

- `src/content/products/aspirems.json`
- `src/content/products/neurolink.json`
- `src/content/products/sanadeep.json`
- `src/content/products/insighttest.json`

## Cloudflare Pages deployment

Auto-deploys on push to `main`.

**Build settings** (configure in Cloudflare Pages dashboard):

| Setting              | Value                   |
| -------------------- | ----------------------- |
| Framework preset     | Astro                   |
| Build command        | `npm run build`         |
| Build output directory | `dist`                |
| Node version         | 20 (or higher)          |

**Preview deployments**: every branch gets its own preview URL automatically.

## Design tokens

- **Colors**: navy `#1a1840`, cream `#faf7ef`, saffron `#d99133`, maroon `#8a1538`
- **Typography**: Fraunces (display), Manrope (body), Noto Serif Devanagari
- **Motion**: all animations respect `prefers-reduced-motion`
- **Accessibility**: WCAG AA contrast, focus-visible outlines, semantic HTML

Tokens live in `tailwind.config.mjs` and `src/styles/global.css`.

## Adding videos (Cloudflare Stream)

Use the Stream embed code inside any MDX or `.astro` file:

```html
<iframe
  src="https://customer-<id>.cloudflarestream.com/<video-id>/iframe"
  loading="lazy"
  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
  allowfullscreen
  class="w-full aspect-video rounded-2xl border border-navy/10"
></iframe>
```

## Legacy HTML

The previous vanilla-HTML version is archived in `_legacy/` (gitignored).
Legacy URLs (`/about.html`, `/aspirems.html`, etc.) are 301-redirected to the
new clean URLs via `public/_redirects`.

---

© 2026 Shambhavi Innovation Lab. Designed and built in India.
