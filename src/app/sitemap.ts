import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
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
    url: `http://127.0.0.1:4400${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: route === '' ? 1 : 0.8,
  }));
}
