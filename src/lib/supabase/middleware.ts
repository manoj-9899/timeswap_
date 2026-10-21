import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { Database } from './types';
import { sanitizeRedirectPath } from '../auth-utils';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Gracefully pass through if Supabase credentials are not configured yet
  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Refresh auth session securely using server-validated getUser()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protected paths that strictly require an authenticated Supabase user
  const protectedRoutes = [
    '/dashboard',
    '/wallet',
    '/sessions',
    '/messages',
    '/notifications',
    '/profile',
    '/settings',
    '/saved',
    '/onboarding',
  ];

  const isProtectedRoute = protectedRoutes.some(
    route => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Auth pages where already-authenticated users should not linger
  const authRoutes = ['/auth/signin', '/auth/signup', '/auth/forgot-password'];
  const isAuthRoute = authRoutes.some(
    route => pathname === route || pathname.startsWith(`${route}/`)
  );

  // If unauthenticated user tries to access a protected route
  if ((!user || userError) && isProtectedRoute) {
    const signInUrl = new URL('/auth/signin', request.url);
    const destination = pathname + (request.nextUrl.search || '');
    const safeNext = sanitizeRedirectPath(destination, '/dashboard');
    signInUrl.searchParams.set('next', safeNext);

    const redirectResponse = NextResponse.redirect(signInUrl);
    // Copy any updated cookies (e.g. clearing expired tokens) to redirect response
    response.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  }

  // If authenticated user visits signin, signup, or forgot-password -> redirect to dashboard
  if (user && !userError && isAuthRoute) {
    const dashboardUrl = new URL('/dashboard', request.url);
    const redirectResponse = NextResponse.redirect(dashboardUrl);
    response.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  }

  return response;
}
