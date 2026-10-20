'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Mail, Lock, Sparkles, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { getSupabaseBrowserClient } from '../../../lib/supabase/client';
import { useTimeSwap } from '../../../lib/store';

export default function SignUpPage() {
  const router = useRouter();
  const { updateCurrentUser } = useTimeSwap();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [primarySkill, setPrimarySkill] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationPending, setVerificationPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = getSupabaseBrowserClient();

    if (supabase) {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const handle = name.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30) || `user_${Date.now().toString().slice(-6)}`;
      
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name.trim(),
            handle,
            primary_skill: primarySkill.trim(),
          },
          emailRedirectTo: `${origin}/auth/callback`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      // If email verification is required and session is not immediately active
      if (data.user && !data.session) {
        setLoading(false);
        setVerificationPending(true);
        return;
      }

      // If user session is established immediately (e.g. auto-confirm in local dev)
      if (data.session) {
        setLoading(false);
        router.push('/onboarding');
        return;
      }
    }

    // Mock fallback mode when Supabase is not yet configured
    if (name.trim()) {
      updateCurrentUser({
        name: name.trim(),
        email: email.trim(),
        handle: name.toLowerCase().replace(/[^a-z0-9]/g, ''),
        onboardingCompleted: false,
        onboardingStep: 1,
      });
    }

    setTimeout(() => {
      setLoading(false);
      router.push('/onboarding');
    }, 500);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        <div className="bg-surface p-8 sm:p-10 rounded-modal border border-line shadow-elevated space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-brand-soft border border-brand/20 flex items-center justify-center text-brand">
              <Sparkles className="w-6 h-6 text-brand" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink font-editorial tracking-tight">
              Join the TimeSwap Circle
            </h1>
            <p className="text-xs sm:text-sm text-ink-muted">
              Receive <strong>3 welcome time credits</strong> upon email verification to begin learning right away.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-status-error">
              {error}
            </div>
          )}

          {verificationPending ? (
            <div className="space-y-5 animate-in fade-in py-2">
              <div className="p-5 bg-brand-soft border border-brand/20 rounded-xl text-xs text-brand-deep space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-brand" />
                  Verification Link Dispatched
                </div>
                <p className="leading-relaxed">
                  We have dispatched a verification email to <strong>{email}</strong>. 
                </p>
                <p className="leading-relaxed text-[11px] text-ink-muted">
                  Please click the link in your email to verify your address, unlock your <strong>3 welcome credits</strong>, and continue into the 6-step onboarding wizard.
                </p>
              </div>

              <div className="pt-2 text-center space-y-2">
                <Link href="/auth/signin" className="block">
                  <Button variant="primary" size="lg" className="w-full">
                    Return to Sign In
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Full Name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Maya Lin"
                leftIcon={<User className="w-4 h-4" />}
                required
              />

              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@domain.com"
                leftIcon={<Mail className="w-4 h-4" />}
                required
              />

              <Input
                label="Password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                leftIcon={<Lock className="w-4 h-4" />}
                required
              />

              <Input
                label="One Skill You Can Teach"
                type="text"
                value={primarySkill}
                onChange={e => setPrimarySkill(e.target.value)}
                placeholder="e.g. Sourdough baking, Python, Greek, Figma"
                hint="You will detail your syllabus and availability during guided onboarding."
                required
              />

              <div className="p-3 bg-brand-soft/60 rounded-xl border border-brand/20 flex items-center gap-2.5 text-xs text-brand-deep">
                <ShieldCheck className="w-4 h-4 text-brand flex-shrink-0" />
                <span>3 welcome time credits awarded automatically upon email confirmation.</span>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-2"
                loading={loading}
                icon={<ArrowRight className="w-4 h-4" />}
                iconPosition="right"
              >
                Create Account
              </Button>

              <div className="text-center text-xs text-ink-muted pt-2 border-t border-line">
                Already have a TimeSwap account?{' '}
                <Link href="/auth/signin" className="text-brand font-semibold hover:underline">
                  Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
