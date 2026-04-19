import { site } from './site';

export interface SeoProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'profile';
  noindex?: boolean;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  tags?: string[];
}

export function buildSeo(props: SeoProps = {}) {
  const title = props.title ? `${props.title} — ${site.shortName}` : `${site.name} — ${site.tagline}`;
  const description = props.description ?? site.description;
  const ogImage = props.ogImage
    ? props.ogImage.startsWith('http')
      ? props.ogImage
      : `${site.url}${props.ogImage}`
    : `${site.url}/og-default.png`;
  const canonical = props.canonical
    ? props.canonical.startsWith('http')
      ? props.canonical
      : `${site.url}${props.canonical}`
    : site.url;

  return {
    title,
    description,
    canonical,
    ogImage,
    ogType: props.ogType ?? 'website',
    noindex: props.noindex ?? false,
    publishedTime: props.publishedTime,
    modifiedTime: props.modifiedTime,
    author: props.author,
    tags: props.tags,
  };
}

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site.name,
    alternateName: site.shortName,
    url: site.url,
    logo: `${site.url}/og-default.png`,
    description: site.description,
    foundingDate: site.founded,
    foundingLocation: {
      '@type': 'Place',
      name: site.foundingLocation,
    },
    founders: site.founders.map((f) => ({
      '@type': 'Person',
      name: f.name,
      jobTitle: f.role,
    })),
    email: site.email,
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'IN',
    },
    sameAs: [],
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.name,
    url: site.url,
    description: site.description,
    inLanguage: 'en-IN',
  };
}

export function articleSchema(props: {
  title: string;
  description: string;
  url: string;
  image?: string;
  publishDate: Date;
  updatedDate?: Date;
  author: string;
  tags?: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: props.title,
    description: props.description,
    image: props.image ?? `${site.url}/og-default.png`,
    datePublished: props.publishDate.toISOString(),
    dateModified: (props.updatedDate ?? props.publishDate).toISOString(),
    author: {
      '@type': 'Organization',
      name: props.author,
      url: site.url,
    },
    publisher: {
      '@type': 'Organization',
      name: site.name,
      logo: {
        '@type': 'ImageObject',
        url: `${site.url}/og-default.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': props.url,
    },
    keywords: props.tags?.join(', '),
  };
}

export function productSchema(props: {
  name: string;
  description: string;
  url: string;
  image?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: props.name,
    description: props.description,
    url: props.url,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    image: props.image,
    publisher: {
      '@type': 'Organization',
      name: site.name,
      url: site.url,
    },
    offers: {
      '@type': 'Offer',
      availability: 'https://schema.org/InStock',
      priceCurrency: 'INR',
      price: '0',
    },
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
