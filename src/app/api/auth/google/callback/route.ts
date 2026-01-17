import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getTokensFromCode, listCalendars } from '@/lib/google/calendar';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // business_id
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=google_auth_failed`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=missing_params`
    );
  }

  try {
    const tokens = await getTokensFromCode(code);
    const supabase = await createServiceClient();

    // Get calendars to find primary
    const calendars = await listCalendars(
      tokens.access_token!,
      tokens.refresh_token!
    );
    const primaryCalendar = calendars.find((c: any) => c.primary) || calendars[0];

    // Save or update connection
    const { data: existing } = await supabase
      .from('google_calendar_connections')
      .select('id')
      .eq('business_id', state)
      .single();

    if (existing) {
      await supabase
        .from('google_calendar_connections')
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expiry: tokens.expiry_date
            ? new Date(tokens.expiry_date).toISOString()
            : null,
          calendar_id: primaryCalendar?.id || 'primary',
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('google_calendar_connections').insert({
        business_id: state,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : null,
        calendar_id: primaryCalendar?.id || 'primary',
      });
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?success=google_connected`
    );
  } catch (error) {
    console.error('Google OAuth error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=google_auth_failed`
    );
  }
}
