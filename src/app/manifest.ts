import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TimeSwap — Reciprocal Knowledge Exchange',
    short_name: 'TimeSwap',
    description: 'Exchange skills without money. Teach what you love for 1 hour to earn 1 time credit; spend it learning from master mentors.',
    start_url: '/',
    id: '/',
    display: 'standalone',
    background_color: '#FAF9F6',
    theme_color: '#347A5C',
    orientation: 'portrait-primary',
    scope: '/',
    lang: 'en',
    dir: 'ltr',
    categories: ['education', 'social', 'productivity'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    screenshots: [
      {
        src: '/og.png',
        sizes: '1200x630',
        type: 'image/png',
      },
    ],
  };
}
