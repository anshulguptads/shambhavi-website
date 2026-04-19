import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      publishDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      author: z.string().default('Shambhavi Innovation Lab'),
      tags: z.array(z.string()).default([]),
      category: z.string().optional(),
      heroImage: image().optional(),
      heroImageAlt: z.string().optional(),
      ogImage: z.string().optional(),
      draft: z.boolean().default(false),
      featured: z.boolean().default(false),
      readingTime: z.string().optional(),
      eyebrow: z.string().optional(),
    }),
});

const products = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    tagline: z.string(),
    eyebrow: z.string(),
    description: z.string(),
    longDescription: z.string(),
    icon: z.string().default('sparkles'),
    accentColor: z.enum(['saffron', 'maroon', 'teal', 'violet']),
    order: z.number(),
    forWhom: z.string(),
    heroDeck: z.string().optional(),
    keyCapabilities: z.array(
      z.object({
        title: z.string(),
        description: z.string(),
      })
    ),
    outcomes: z.array(z.string()),
    proofPoints: z
      .array(
        z.object({
          metric: z.string(),
          label: z.string(),
        })
      )
      .default([]),
    faqs: z
      .array(
        z.object({
          q: z.string(),
          a: z.string(),
        })
      )
      .default([]),
    ogImage: z.string().optional(),
    ctaLabel: z.string().default('Request a Demo'),
    ctaHref: z.string().default('/#contact'),
    status: z.enum(['active', 'beta', 'coming-soon']).default('coming-soon'),
  }),
});

export const collections = { blog, products };
