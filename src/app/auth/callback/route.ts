import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/onboarding';

  if (code) {
    const supabase = createSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        // Fetch verified user profile to route to dashboard or onboarding
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('onboarding_completed, onboarding_step')
            .eq('id', user.id)
            .maybeSingle();

          const typedProfile = profile as { onboarding_completed?: boolean; onboarding_step?: number } | null;

          if (typedProfile?.onboarding_completed) {
            return NextResponse.redirect(`${origin}/dashboard`);
          } else {
            return NextResponse.redirect(`${origin}/onboarding`);
          }
        }
      }
    }
  }

  // Redirect to requested next destination
  return NextResponse.redirect(`${origin}${next}`);
}
