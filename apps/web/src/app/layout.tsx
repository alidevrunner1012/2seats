import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import Script from 'next/script';
import type { ReactNode } from 'react';
import { Providers } from '@/components/providers';
import { SPLASH_SESSION_KEY } from '@/features/brand/splash-state';
import { env } from '@/lib/env';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: {
    default: '2Seats — Your seat is always next to mine',
    template: '%s | 2Seats',
  },
  description:
    'A little movie magic, just for two. Your seat is always next to mine.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '2Seats',
  },
};

export const viewport: Viewport = {
  themeColor: '#E8466C',
  colorScheme: 'dark',
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${fraunces.variable} ${inter.variable} noise-overlay antialiased`}
      >
        <Script
          id="intro-session-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `try {
  if (window.sessionStorage.getItem(${JSON.stringify(SPLASH_SESSION_KEY)}) === 'true') {
    document.documentElement.dataset.introSeen = 'true';
  }
} catch (error) {
  console.error('Unable to access intro session storage.', error);
}`,
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
