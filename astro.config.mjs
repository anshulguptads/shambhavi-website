import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';

/**
 * The adapter's auto-generated _routes.json can emit overlapping rules
 * (a directory splat plus individual files beneath it), which Cloudflare
 * Pages rejects at deploy time. We know exactly which routes need the
 * worker, so overwrite it with the canonical minimal version.
 */
const routesJsonOverride = {
  name: 'routes-json-override',
  hooks: {
    'astro:build:done': async ({ dir }) => {
      const fs = await import('node:fs/promises');
      await fs.writeFile(
        new URL('_routes.json', dir),
        JSON.stringify(
          { version: 1, include: ['/api/*', '/keystatic', '/keystatic/*', '/_server-islands/*'], exclude: [] },
          null,
          2
        )
      );
    },
  },
};

export default defineConfig({
  site: 'https://shambhavilabs.com',
  // Static-first: every page stays prerendered; only routes that opt out
  // (export const prerender = false — the form APIs) run on Workers.
  adapter: cloudflare({
    // Local D1/env bindings for `astro dev` come from the dev-only config —
    // the root wrangler.jsonc stays binding-free until real ids exist
    // (Pages rejects deploys whose bindings have invalid ids).
    platformProxy: { enabled: true, configPath: 'cloudflare.dev.jsonc' },
    imageService: 'compile', // sharp optimizes prerendered pages at build time
  }),
  integrations: [
    react(),
    keystatic(),
    mdx(),
    sitemap(),
    tailwind({ applyBaseStyles: false }),
    routesJsonOverride,
  ],
  build: {
    format: 'directory',
    assets: '_assets',
  },
  trailingSlash: 'never',
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
  vite: {
    build: {
      cssCodeSplit: true,
    },
  },
});
