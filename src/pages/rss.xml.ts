import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { site } from '@lib/site';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = (await getCollection('blog', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime()
  );

  return rss({
    title: `${site.name} · Journal`,
    description:
      'Essays and notes from Shambhavi Innovation Lab — on AI, India, education, enterprise software, and the thesis behind our four platforms.',
    site: context.site ?? site.url,
    customData: '<language>en-in</language>',
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.publishDate,
      link: `/journal/${post.slug}`,
      author: post.data.author,
      categories: post.data.tags,
    })),
  });
}
