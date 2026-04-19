export const site = {
  name: 'Shambhavi Innovation Lab',
  shortName: 'Shambhavi',
  url: 'https://shambhavilabs.com',
  tagline: 'AI-native software for how India learns, works, and builds.',
  description:
    'Shambhavi Innovation Lab builds AI-native platforms for learning, working, and building — from K-12 to enterprise. Founded in India, designed for the world.',
  email: 'info@shambhavilabs.com',
  founded: '2026',
  foundingLocation: 'India',
  locale: 'en_IN',
  twitter: '@shambhavilabs',
  founders: [
    { name: 'Shalki Sharma', role: 'Co-Founder & Chief Executive', image: '/images/shalki.jpg' },
    { name: 'Aman Verma', role: 'Co-Founder & Chief Product Officer', image: '/images/aman.jpg' },
  ],
} as const;

export const nav = {
  primary: [
    { label: 'Platforms', href: '/#platforms' },
    { label: 'About', href: '/about' },
    { label: 'Journal', href: '/journal' },
  ],
  cta: { label: 'Request a Pilot', href: '/#contact' },
  products: [
    { label: 'AspiremsAI', href: '/platforms/aspirems', description: 'Adaptive learning for schools' },
    { label: 'NeuroLink', href: '/platforms/neurolink', description: 'Knowledge graph intelligence' },
    { label: 'SanaDeep', href: '/platforms/sanadeep', description: 'Corporate upskilling' },
    { label: 'InsightTest', href: '/platforms/insighttest', description: 'Assessment & evaluation' },
  ],
} as const;

export const footerLinks = {
  platforms: [
    { label: 'AspiremsAI', href: '/platforms/aspirems' },
    { label: 'NeuroLink', href: '/platforms/neurolink' },
    { label: 'SanaDeep', href: '/platforms/sanadeep' },
    { label: 'InsightTest', href: '/platforms/insighttest' },
  ],
  company: [
    { label: 'About', href: '/about' },
    { label: 'Journal', href: '/journal' },
    { label: 'Contact', href: 'mailto:info@shambhavilabs.com' },
  ],
  resources: [
    { label: 'RSS Feed', href: '/rss.xml' },
    { label: 'Sitemap', href: '/sitemap-index.xml' },
  ],
} as const;

export type SiteConfig = typeof site;
