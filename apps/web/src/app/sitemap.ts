import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = new URL(env.NEXT_PUBLIC_SITE_URL);
  return [
    {
      url: new URL('/', baseUrl).toString(),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: new URL('/design', baseUrl).toString(),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];
}
