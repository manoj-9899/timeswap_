'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Mail, Lock, Sparkles, ArrowRight, CheckCircle2, ShieldCheck, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { getSupabaseBrowserClient } from '../../../lib/supabase/client';
import { useTimeSwap } from '../../../lib/store';
import { validatePassword } from '../../../lib/auth-utils';

export default function SignUpPage() {
  const router = useRouter();
  const { updateCurrentUser } = useTimeSwap();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [primarySkill, setPrimarySkill] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationPending, setVerificationPending] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer for resend rate-limit cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validations
    if (name.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please ensure both fields are identical.');
      return;
    }

    if (!primarySkill.trim()) {
      setError('Please provide at least one skill you can teach.');
      return;
    }

    setLoading(true);

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
        if (signUpError.message.toLowerCase().includes('already registered')) {
          setError('An account with this email address already exists. Please sign in or reset your password.');
        } else {
          setError(signUpError.message);
        }
        setLoading(false);
        return;
      }

      // If email verification is required (session not yet established)
      if (data.user && !data.session) {
        setLoading(false);
        setVerificationPending(true);
        setResendCooldown(60);
        return;
      }

      // If user session is established immediately (e.g. auto-confirm environments)
      if (data.session) {
        setLoading(false);
        router.push('/onboarding');
        return;
      }
    }

    // Mock fallback mode when Supabase is not configured
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

  const handleResendVerification = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setResendMessage('');

    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: {
          emailRedirectTo: `${origin}/auth/callback`,
        },
      });

      if (resendError) {
        setResendMessage(`Failed to resend: ${resendError.message}`);
      } else {
        setResendMessage('A new verification email has been dispatched. Please check your inbox.');
        setResendCooldown(60);
      }
    } else {
      setResendMessage('Verification email re-dispatched in simulation mode.');
      setResendCooldown(60);
    }
    setResending(false);
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
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-status-error leading-relaxed">
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
                  We have dispatched a secure verification email to <strong>{email}</strong>.
                </p>
                <p className="leading-relaxed text-[11px] text-ink-muted">
                  Please click the link in your email to verify your address, unlock your <strong>3 welcome credits</strong>, and continue into the guided onboarding wizard.
                </p>
              </div>

              {resendMessage && (
                <div className="p-3 bg-surface-subtle border border-line rounded-xl text-xs text-ink">
                  {resendMessage}
                </div>
              )}

              <div className="pt-2 text-center space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  className="w-full"
                  onClick={handleResendVerification}
                  loading={resending}
                  disabled={resendCooldown > 0 || resending}
                  icon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Verification Email'}
                </Button>

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
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="hover:text-ink transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                required
              />

              <Input
                label="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    className="hover:text-ink transition-colors focus:outline-none"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
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
                disabled={loading}
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
