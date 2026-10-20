'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { getSupabaseBrowserClient } from '../../../lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${origin}/auth/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
        setLoading(false);
        return;
      }
    }

    // Success (either through Supabase or mock simulation)
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        <div className="bg-surface p-8 sm:p-10 rounded-modal border border-line shadow-elevated space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-brand-soft border border-brand/20 flex items-center justify-center text-brand">
              <Mail className="w-6 h-6 text-brand" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink font-editorial tracking-tight">
              Reset Your Password
            </h1>
            <p className="text-xs sm:text-sm text-ink-muted">
              Enter your email address to receive password recovery instructions.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-status-error">
              {error}
            </div>
          )}

          {submitted ? (
            <div className="space-y-5 animate-in fade-in">
              <div className="p-4 bg-brand-soft border border-brand/20 rounded-xl text-xs text-brand-deep space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-brand" />
                  Reset Link Dispatched
                </div>
                <p className="leading-relaxed">
                  We have sent password reset instructions to <strong>{email || 'your email'}</strong>. Please check your inbox and follow the secure link to set your new password.
                </p>
              </div>

              <Link href="/auth/signin" className="block">
                <Button variant="primary" size="lg" className="w-full">
                  Back to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Registered Email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                leftIcon={<Mail className="w-4 h-4" />}
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-2"
                loading={loading}
              >
                Send Password Reset Instructions
              </Button>

              <div className="text-center pt-2">
                <Link
                  href="/auth/signin"
                  className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink font-semibold"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
