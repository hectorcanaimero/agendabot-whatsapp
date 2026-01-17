import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google/calendar';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const businessId = searchParams.get('business_id');

  if (!businessId) {
    return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
  }

  const authUrl = getAuthUrl(businessId);
  return NextResponse.redirect(authUrl);
}
