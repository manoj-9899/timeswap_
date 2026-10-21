'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { getSupabaseBrowserClient } from '../../../lib/supabase/client';
import { validatePassword } from '../../../lib/auth-utils';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionInvalid, setSessionInvalid] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Verify that an active authenticated session exists before allowing password reset
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setSessionInvalid(true);
      setCheckingSession(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      if (sessionError || !session) {
        setSessionInvalid(true);
      }
      setCheckingSession(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please ensure both fields are identical.');
      return;
    }

    setLoading(true);

    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    setSuccess(true);
    setTimeout(() => {
      router.push('/dashboard');
    }, 2000);
  };

  if (checkingSession) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
        <div className="text-center text-xs text-ink-muted">Verifying recovery credentials...</div>
      </div>
    );
  }

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        <div className="bg-surface p-8 sm:p-10 rounded-modal border border-line shadow-elevated space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-brand-soft border border-brand/20 flex items-center justify-center text-brand">
              <Lock className="w-6 h-6 text-brand" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink font-editorial tracking-tight">
              Create New Password
            </h1>
            <p className="text-xs sm:text-sm text-ink-muted">
              Choose a strong, secure password for your TimeSwap account.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-status-error leading-relaxed">
              {error}
            </div>
          )}

          {sessionInvalid ? (
            <div className="space-y-4 animate-in fade-in py-2">
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-status-error space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <AlertCircle className="w-4 h-4 text-status-error" />
                  No Active Reset Session
                </div>
                <p className="leading-relaxed">
                  Your password reset link is invalid, expired, or has already been used. Please request a new link to proceed.
                </p>
              </div>

              <Link href="/auth/forgot-password" className="block">
                <Button variant="primary" size="lg" className="w-full">
                  Request New Reset Link
                </Button>
              </Link>
            </div>
          ) : success ? (
            <div className="space-y-4 animate-in fade-in text-center py-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-brand-soft flex items-center justify-center text-brand">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-ink">Password Updated Successfully</h2>
              <p className="text-xs text-ink-muted">
                Your credentials have been securely updated. Redirecting to your dashboard...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="New Password"
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
                label="Confirm New Password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
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

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-2"
                loading={loading}
                disabled={loading}
              >
                Update Password
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
