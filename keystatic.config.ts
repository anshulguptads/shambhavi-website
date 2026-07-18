/**
 * Keystatic CMS — founders edit the journal and product pages from a browser.
 *
 * Collections map 1:1 onto the existing Astro content collections
 * (src/content/config.ts); publishing writes the same MDX files a developer
 * would, so git stays the single source of truth.
 *
 * Storage: 'local' during development (edits the working tree).
 * Production: Keystatic Cloud — set KEYSTATIC_STORAGE=cloud and
 * KEYSTATIC_PROJECT=<team/project> at build time (docs/DYNAMIC-SETUP.md §4).
 */
import { config, collection, fields } from '@keystatic/core';

const useCloud = import.meta.env.KEYSTATIC_STORAGE === 'cloud';
const cloudProject = (import.meta.env.KEYSTATIC_PROJECT as string | undefined) ?? '';

export default config({
  storage: useCloud ? { kind: 'cloud' } : { kind: 'local' },
  ...(useCloud ? { cloud: { project: cloudProject } } : {}),

  ui: {
    brand: { name: 'Shambhavi Journal & Platforms' },
  },

  collections: {
    journal: collection({
      label: 'Journal',
      slugField: 'title',
      path: 'src/content/blog/*',
      format: { contentField: 'body' },
      entryLayout: 'content',
      columns: ['publishDate', 'draft'],
      schema: {
        title: fields.slug({ name: { label: 'Title', validation: { isRequired: true } } }),
        description: fields.text({
          label: 'Description',
          description: 'One or two sentences — used in listings, SEO, and social cards.',
          multiline: true,
          validation: { isRequired: true },
        }),
        publishDate: fields.date({ label: 'Publish date', defaultValue: { kind: 'today' }, validation: { isRequired: true } }),
        updatedDate: fields.date({ label: 'Updated date (optional)' }),
        author: fields.text({ label: 'Author', defaultValue: 'Shambhavi Innovation Lab' }),
        category: fields.text({ label: 'Category', description: 'e.g. Essay, Field Notes, Product' }),
        eyebrow: fields.text({ label: 'Eyebrow (optional)', description: 'Small label above the title on the post page.' }),
        tags: fields.array(fields.text({ label: 'Tag' }), {
          label: 'Tags',
          itemLabel: (props) => props.value || 'tag',
        }),
        readingTime: fields.text({ label: 'Reading time', description: 'e.g. "8 min read" — leave blank to omit.' }),
        draft: fields.checkbox({ label: 'Draft', description: 'Drafts never appear on the live site.', defaultValue: false }),
        featured: fields.checkbox({ label: 'Featured', description: 'Featured posts lead the journal page.', defaultValue: false }),
        ogImage: fields.text({ label: 'Social image path (optional)', description: 'e.g. /blog/og-my-post.png (ask the team to add the file).' }),
        body: fields.mdx({ label: 'Essay' }),
      },
    }),

    products: collection({
      label: 'Platforms',
      slugField: 'name',
      path: 'src/content/products/*',
      format: { contentField: 'body' },
      columns: ['order'],
      schema: {
        name: fields.slug({ name: { label: 'Name', validation: { isRequired: true } } }),
        tagline: fields.text({ label: 'Tagline', multiline: true, validation: { isRequired: true } }),
        eyebrow: fields.text({ label: 'Eyebrow', description: 'e.g. "LEARN · SCHOOL"', validation: { isRequired: true } }),
        description: fields.text({ label: 'Short description', multiline: true, validation: { isRequired: true } }),
        longDescription: fields.text({ label: 'Long description', multiline: true, validation: { isRequired: true } }),
        icon: fields.text({ label: 'Icon key', defaultValue: 'sparkles' }),
        accentColor: fields.select({
          label: 'Accent color',
          options: [
            { label: 'Saffron', value: 'saffron' },
            { label: 'Maroon', value: 'maroon' },
            { label: 'Teal', value: 'teal' },
            { label: 'Violet', value: 'violet' },
          ],
          defaultValue: 'saffron',
        }),
        order: fields.number({ label: 'Display order', validation: { isRequired: true } }),
        forWhom: fields.text({ label: 'For whom', multiline: true, validation: { isRequired: true } }),
        heroDeck: fields.text({ label: 'Hero deck (optional)', multiline: true }),
        status: fields.select({
          label: 'Status',
          options: [
            { label: 'Live', value: 'active' },
            { label: 'In pilot', value: 'beta' },
            { label: 'Coming soon', value: 'coming-soon' },
          ],
          defaultValue: 'coming-soon',
        }),
        keyCapabilities: fields.array(
          fields.object({
            title: fields.text({ label: 'Title', validation: { isRequired: true } }),
            description: fields.text({ label: 'Description', multiline: true, validation: { isRequired: true } }),
          }),
          { label: 'Key capabilities', itemLabel: (props) => props.fields.title.value || 'capability' }
        ),
        outcomes: fields.array(fields.text({ label: 'Outcome', multiline: true }), {
          label: 'Outcomes',
          itemLabel: (props) => props.value || 'outcome',
        }),
        proofPoints: fields.array(
          fields.object({
            metric: fields.text({ label: 'Metric', validation: { isRequired: true } }),
            label: fields.text({ label: 'Label', validation: { isRequired: true } }),
          }),
          { label: 'Proof points', itemLabel: (props) => `${props.fields.metric.value} — ${props.fields.label.value}` }
        ),
        faqs: fields.array(
          fields.object({
            q: fields.text({ label: 'Question', validation: { isRequired: true } }),
            a: fields.text({ label: 'Answer', multiline: true, validation: { isRequired: true } }),
          }),
          { label: 'FAQs', itemLabel: (props) => props.fields.q.value || 'question' }
        ),
        ogImage: fields.text({ label: 'Social image path (optional)' }),
        ctaLabel: fields.text({ label: 'CTA label', defaultValue: 'Request a Demo' }),
        ctaHref: fields.text({ label: 'CTA link', defaultValue: '/#contact' }),
        body: fields.mdx({ label: 'Page body (optional MDX)' }),
      },
    }),
  },
});
