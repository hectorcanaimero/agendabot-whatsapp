import { NextResponse } from 'next/server';

/**
 * Health check endpoint for Docker container monitoring
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'agendabot-whatsapp',
  });
}
