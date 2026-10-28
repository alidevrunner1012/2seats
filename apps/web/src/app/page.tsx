import { env } from '@/lib/env';
import type { Metadata } from 'next';
import LandingPage from './landing-page';

export const metadata: Metadata = {
  title: 'Movie dates for people miles apart | 2Seats',
  description:
    'Save a seat for someone you love. Share a room, see each other, and watch together with 2Seats.',
  alternates: { canonical: new URL('/', env.NEXT_PUBLIC_SITE_URL) },
  openGraph: {
    title: 'Your seat is always next to mine. | 2Seats',
    description: 'Movie dates for people who are miles apart.',
    url: new URL('/', env.NEXT_PUBLIC_SITE_URL),
    siteName: '2Seats',
    type: 'website',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Two glowing theatre seats side by side, with a heart between them',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Your seat is always next to mine. | 2Seats',
    description: 'Movie dates for people who are miles apart.',
    images: ['/opengraph-image'],
  },
};

export default function HomePage(): JSX.Element {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '2Seats',
    url: env.NEXT_PUBLIC_SITE_URL,
    description: 'Movie dates for people who are miles apart.',
    applicationCategory: 'EntertainmentApplication',
    operatingSystem: 'Web',
    slogan: 'Your seat is always next to mine.',
  };

  return (
    <>
      <LandingPage />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </>
  );
}
