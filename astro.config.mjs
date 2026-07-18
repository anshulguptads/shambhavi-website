import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://shambhavilabs.com',
  // Static-first: every page stays prerendered; only routes that opt out
  // (export const prerender = false — the form APIs) run on Workers.
  adapter: cloudflare({
    platformProxy: { enabled: true }, // local D1/env bindings in `astro dev`
    imageService: 'compile', // sharp optimizes prerendered pages at build time
  }),
  integrations: [
    mdx(),
    sitemap(),
    tailwind({ applyBaseStyles: false }),
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
