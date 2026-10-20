'use client';

import React from 'react';
import Link from 'next/link';
import { WifiOff, RefreshCw, ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export default function OfflinePage() {
  const handleRetry = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center bg-surface border border-line rounded-3xl p-8 shadow-card">
        {/* Offline Icon Illustration */}
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto mb-6 shadow-sm">
          <WifiOff className="w-8 h-8" />
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-serif font-bold text-ink mb-3">
          You are currently offline
        </h1>

        {/* Explanation */}
        <p className="text-ink-muted text-sm leading-relaxed mb-6">
          TimeSwap relies on live database integrity, credit escrow, and Supabase Realtime for secure skill exchanges. 
          Session bookings, messaging, and wallet transfers are paused until your connection is restored.
        </p>

        {/* Integrity Notice */}
        <div className="flex items-start gap-3 p-3.5 bg-canvas rounded-2xl border border-line text-left mb-6">
          <ShieldAlert className="w-5 h-5 text-brand shrink-0 mt-0.5" />
          <p className="text-xs text-ink-muted leading-relaxed">
            <strong className="text-ink font-medium">Safe Offline Mode:</strong> No transactions or state changes are queued offline to prevent duplicate escrow transfers or out-of-sync bookings.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={handleRetry}
            variant="primary"
            className="w-full flex items-center justify-center gap-2 py-3"
          >
            <RefreshCw className="w-4 h-4" />
            Check Connection & Retry
          </Button>

          <Link href="/">
            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-2 py-3"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
