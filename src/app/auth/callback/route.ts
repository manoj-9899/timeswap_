import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { sanitizeRedirectPath } from '../../../lib/auth-utils';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const searchParams = requestUrl.searchParams;

  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const code = searchParams.get('code');
  const next = searchParams.get('next');
  const type = searchParams.get('type');

  // Handle errors emitted by Supabase Auth (e.g. expired or invalid OTP links)
  if (error) {
    const errorMsg = errorDescription || error || 'Authentication verification failed.';
    const redirectUrl = new URL('/auth/signin', request.url);
    redirectUrl.searchParams.set('error', errorMsg);
    return NextResponse.redirect(redirectUrl);
  }

  // Validate and sanitize target path against open-redirect vulnerabilities
  const safeNext = sanitizeRedirectPath(next, '/dashboard');

  // Handle password recovery flow
  if (type === 'recovery' || safeNext.startsWith('/auth/reset-password')) {
    if (code) {
      const supabase = createSupabaseServerClient();
      if (supabase) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          const redirectUrl = new URL('/auth/signin', request.url);
          redirectUrl.searchParams.set('error', exchangeError.message);
          return NextResponse.redirect(redirectUrl);
        }
      }
    }
    return NextResponse.redirect(new URL('/auth/reset-password', request.url));
  }

  // Handle signup email verification & standard login callbacks
  if (code) {
    const supabase = createSupabaseServerClient();
    if (supabase) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        const redirectUrl = new URL('/auth/signin', request.url);
        redirectUrl.searchParams.set('error', exchangeError.message);
        return NextResponse.redirect(redirectUrl);
      }

      // Check user onboarding state
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .maybeSingle();

        const typedProfile = profile as { onboarding_completed?: boolean } | null;
        if (!typedProfile?.onboarding_completed) {
          return NextResponse.redirect(new URL('/onboarding', request.url));
        }
      }

      return NextResponse.redirect(new URL(safeNext, request.url));
    }
  }

  // If no code was provided and not a recovery flow
  const redirectUrl = new URL('/auth/signin', request.url);
  redirectUrl.searchParams.set('error', 'Missing verification token.');
  return NextResponse.redirect(redirectUrl);
}
