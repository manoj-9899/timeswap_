import React from 'react';
import Link from 'next/link';
import { Heart, Compass, Shield, Clock } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-surface-subtle border-t border-line mt-20 pt-16 pb-12 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 pb-12 border-b border-line">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5 select-none">
              <div className="w-8 h-8 rounded-xl bg-brand-soft border border-brand/20 flex items-center justify-center text-brand">
                <svg className="w-5 h-5 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="9" cy="12" r="5" />
                  <circle cx="15" cy="12" r="5" />
                </svg>
              </div>
              <span className="font-extrabold text-xl text-ink tracking-tight font-editorial">
                Time<span className="text-brand">Swap</span>
              </span>
            </Link>
            <p className="text-sm text-ink-muted leading-relaxed max-w-sm">
              A peer-to-peer reciprocal skill exchange founded on the principle that human curiosity has no price tag. One hour taught unlocks one hour learned.
            </p>
            <div className="flex items-center gap-3 text-xs text-brand-deep font-semibold pt-1">
              <span className="inline-flex items-center gap-1 bg-brand-soft px-2.5 py-1 rounded-pill border border-brand/20">
                <Clock className="w-3.5 h-3.5" /> 100% Non-Monetary
              </span>
              <span className="inline-flex items-center gap-1 bg-surface px-2.5 py-1 rounded-pill border border-line">
                <Shield className="w-3.5 h-3.5 text-brand" /> 2-Way Verified
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-ink">Explore</p>
            <ul className="space-y-1 text-sm text-ink-muted">
              <li><Link href="/discover" className="py-1 inline-block hover:text-brand transition-colors">Discover Mentors</Link></li>
              <li><Link href="/discover?category=Design%20%26%20Creative" className="py-1 inline-block hover:text-brand transition-colors">Design & Typography</Link></li>
              <li><Link href="/discover?category=Code%20%26%20Technology" className="py-1 inline-block hover:text-brand transition-colors">Code & Systems</Link></li>
              <li><Link href="/discover?category=Crafts%20%26%20Hands-on" className="py-1 inline-block hover:text-brand transition-colors">Crafts & Ceramics</Link></li>
              <li><Link href="/discover?category=Languages%20%26%20Writing" className="py-1 inline-block hover:text-brand transition-colors">Languages & Letters</Link></li>
            </ul>
          </div>

          {/* Platform */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-ink">Platform</p>
            <ul className="space-y-1 text-sm text-ink-muted">
              <li><Link href="/dashboard" className="py-1 inline-block hover:text-brand transition-colors">Member Dashboard</Link></li>
              <li><Link href="/sessions" className="py-1 inline-block hover:text-brand transition-colors">Active Exchanges</Link></li>
              <li><Link href="/wallet" className="py-1 inline-block hover:text-brand transition-colors">Time-Credit Ledger</Link></li>
              <li><Link href="/onboarding" className="py-1 inline-block hover:text-brand transition-colors">Onboarding Guide</Link></li>
              <li><Link href="/saved" className="py-1 inline-block hover:text-brand transition-colors">Saved Bookmarks</Link></li>
            </ul>
          </div>

          {/* Community & Values */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-ink">Community</p>
            <ul className="space-y-1 text-sm text-ink-muted">
              <li><Link href="/help" className="py-1 inline-block hover:text-brand transition-colors">Help Center & FAQs</Link></li>
              <li><Link href="/#principles" className="py-1 inline-block hover:text-brand transition-colors">Reciprocity Charter</Link></li>
              <li><Link href="/settings" className="py-1 inline-block hover:text-brand transition-colors">Account Settings</Link></li>
              <li><Link href="/auth/signup" className="py-1 inline-block hover:text-brand transition-colors">Join TimeSwap</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-muted">
          <p>© 2026 TimeSwap Community. Designed with care for human craft and curiosity.</p>
          <div className="flex items-center gap-6">
            <span>Refined Light Theme Only</span>
            <span className="w-1 h-1 rounded-full bg-ink-muted/40" />
            <span>Zero Platform Fees</span>
            <span className="w-1 h-1 rounded-full bg-ink-muted/40" />
            <span>Pure Reciprocal Learning</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
