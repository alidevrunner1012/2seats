import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '2Seats — movie dates together',
    short_name: '2Seats',
    description: 'Your seat is always next to mine.',
    start_url: '/',
    display: 'standalone',
    background_color: '#1A0B14',
    theme_color: '#E8466C',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
