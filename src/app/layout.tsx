import type { Metadata } from 'next';
import { sans, editorial } from './fonts';
import './globals.css';
import { TimeSwapProvider } from '../lib/store';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

export const metadata: Metadata = {
  title: 'TimeSwap: Peer-to-Peer Skill Learning & Reciprocal Time Credits',
  description: 'Exchange skills without money. Teach what you love for 1 hour to earn 1 time credit; spend it learning from master mentors in design, code, and craft.',
  keywords: ['skill swap', 'time credits', 'peer to peer learning', 'reciprocal mentorship', 'creative community'],
  authors: [{ name: 'TimeSwap Design Community' }],
  metadataBase: new URL('http://127.0.0.1:4400'),
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
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="canonical" href="http://127.0.0.1:4400" />
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
        </TimeSwapProvider>
      </body>
    </html>
  );
}
