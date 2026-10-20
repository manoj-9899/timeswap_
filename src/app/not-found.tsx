import React from 'react';
import Link from 'next/link';
import { Clock, ArrowLeft, Compass } from 'lucide-react';
import { Button } from '../components/ui/Button';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6 bg-surface p-8 sm:p-10 rounded-modal border border-line shadow-elevated">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-soft border border-brand/20 flex items-center justify-center text-brand">
          <Clock className="w-8 h-8 animate-pulse-subtle" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-ink-muted">
            Error 404 • Temporal Discontinuity
          </span>
          <h1 className="text-3xl font-extrabold text-ink font-editorial tracking-tight">
            Hour Not Found
          </h1>
          <p className="text-sm text-ink-muted leading-relaxed">
            The session, mentor, or credit transaction you are seeking does not exist on this timeline. Perhaps it has already been reciprocated.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/">
            <Button variant="primary" icon={<ArrowLeft className="w-4 h-4" />}>
              Return Home
            </Button>
          </Link>
          <Link href="/discover">
            <Button variant="secondary" icon={<Compass className="w-4 h-4" />}>
              Explore Mentors
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
