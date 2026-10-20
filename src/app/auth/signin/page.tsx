'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight, UserCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Avatar } from '../../../components/ui/Avatar';
import { useTimeSwap } from '../../../lib/store';
import { getSupabaseBrowserClient } from '../../../lib/supabase/client';

export default function SignInPage() {
  const router = useRouter();
  const { currentUser, members, updateCurrentUser } = useTimeSwap();
  const [email, setEmail] = useState('ana.silva@example.com');
  const [password, setPassword] = useState('timeswap-demo-pass');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = getSupabaseBrowserClient();

    if (supabase) {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        if (signInError.message.toLowerCase().includes('email not confirmed')) {
          setError('Your email address has not been verified yet. Please check your inbox for the confirmation link to activate your account.');
        } else {
          setError(signInError.message);
        }
        setLoading(false);
        return;
      }

      // Fetch profile to check onboarding state
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed, onboarding_step')
          .eq('id', data.user.id)
          .maybeSingle();

        const typedProfile = profile as { onboarding_completed?: boolean; onboarding_step?: number } | null;

        setLoading(false);
        if (typedProfile?.onboarding_completed) {
          router.push('/dashboard');
        } else {
          router.push('/onboarding');
        }
        return;
      }
    }

    // Mock fallback mode when Supabase is not configured
    setTimeout(() => {
      setLoading(false);
      router.push('/dashboard');
    }, 500);
  };

  const handleQuickLogin = (memberId: string) => {
    const target = members.find(m => m.id === memberId);
    if (target) {
      updateCurrentUser({
        id: target.id,
        name: target.name,
        handle: target.handle,
        avatar: target.avatar,
        headline: target.headline,
        bio: target.bio,
        location: target.location,
        timezone: target.timezone,
        skillsTeaching: target.skillsTeaching,
        skillsLearning: target.skillsLearning,
        hoursTaught: target.hoursTaught,
        hoursLearned: target.hoursLearned,
        availableCredits: 3.0,
        onboardingCompleted: true,
        onboardingStep: 6,
      });
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        {/* Card */}
        <div className="bg-surface p-8 sm:p-10 rounded-modal border border-line shadow-elevated space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-brand-soft border border-brand/20 flex items-center justify-center text-brand">
              <svg className="w-6 h-6 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="9" cy="12" r="5" />
                <circle cx="15" cy="12" r="5" />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink font-editorial tracking-tight">
              Welcome Back to TimeSwap
            </h1>
            <p className="text-xs sm:text-sm text-ink-muted">
              Enter your credentials to access your time-credit account.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-status-error leading-relaxed">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@domain.com"
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-ink uppercase tracking-wider">
                  Password
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-brand hover:underline font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                leftIcon={<Lock className="w-4 h-4" />}
                required
              />
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
              Sign In to TimeSwap
            </Button>
          </form>

          <div className="text-center text-xs text-ink-muted pt-2 border-t border-line">
            New to skill exchange?{' '}
            <Link href="/auth/signup" className="text-brand font-semibold hover:underline">
              Create an account
            </Link>
          </div>
        </div>

        {/* Quick Demo Login Preset Switcher */}
        <div className="bg-surface p-6 rounded-card border border-line space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand" />
              Demo Quick Login Presets
            </span>
            <Badge variant="neutral" size="sm">Prototype Aid</Badge>
          </div>
          <p className="text-[11px] text-ink-muted leading-tight">
            Select a sample member profile to test the application in offline simulation mode:
          </p>

          <div className="grid grid-cols-1 gap-2 pt-1">
            {members.slice(0, 3).map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => handleQuickLogin(m.id)}
                className="flex items-center justify-between p-2.5 rounded-xl border border-line hover:border-brand/40 hover:bg-surface-subtle transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <Avatar src={m.avatar} name={m.name} size="sm" />
                  <div>
                    <div className="text-xs font-bold text-ink group-hover:text-brand transition-colors">
                      {m.name}
                    </div>
                    <div className="text-[11px] text-ink-muted line-clamp-1">
                      {m.headline}
                    </div>
                  </div>
                </div>
                <UserCheck className="w-4 h-4 text-ink-muted group-hover:text-brand transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
