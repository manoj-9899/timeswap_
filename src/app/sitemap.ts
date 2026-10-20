import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL 
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  const routes = [
    '',
    '/discover',
    '/dashboard',
    '/sessions',
    '/wallet',
    '/messages',
    '/notifications',
    '/profile',
    '/settings',
    '/saved',
    '/help',
    '/onboarding',
    '/auth/signin',
    '/auth/signup',
    '/auth/forgot-password',
  ];

  return routes.map(route => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: route === '' ? 1 : 0.8,
  }));
}
