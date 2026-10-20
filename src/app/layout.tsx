import type { Metadata, Viewport } from 'next';
import { sans, editorial } from './fonts';
import './globals.css';
import { TimeSwapProvider } from '../lib/store';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { ServiceWorkerRegister } from '../components/ServiceWorkerRegister';

const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL 
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

export const viewport: Viewport = {
  themeColor: '#347A5C',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  title: 'TimeSwap: Peer-to-Peer Skill Learning & Reciprocal Time Credits',
  description: 'Exchange skills without money. Teach what you love for 1 hour to earn 1 time credit; spend it learning from master mentors in design, code, and craft.',
  keywords: ['skill swap', 'time credits', 'peer to peer learning', 'reciprocal mentorship', 'creative community', 'pwa'],
  authors: [{ name: 'TimeSwap Design Community' }],
  metadataBase: new URL(appBaseUrl),
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TimeSwap',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'TimeSwap: Reciprocal Knowledge Exchange',
    description: 'Human curiosity has no price tag. One hour taught unlocks one hour learned.',
    type: 'website',
    locale: 'en_US',
    siteName: 'TimeSwap',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'TimeSwap Reciprocal Knowledge Exchange' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TimeSwap: Reciprocal Knowledge Exchange',
    description: 'Exchange skills without money. 1 hour taught = 1 hour learned.',
    images: ['/og.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${editorial.variable}`}>
      <head>
        <meta name="color-scheme" content="light" />
        <meta name="application-name" content="TimeSwap" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className="bg-canvas text-ink antialiased flex flex-col min-h-screen selection:bg-brand-soft selection:text-brand-deep">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-brand-deep focus:font-bold focus:rounded-xl focus:shadow-elevated focus:border focus:border-line"
        >
          Skip to main content
        </a>
        <TimeSwapProvider>
          <Navbar />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <Footer />
          <ServiceWorkerRegister />
        </TimeSwapProvider>
      </body>
    </html>
  );
}
