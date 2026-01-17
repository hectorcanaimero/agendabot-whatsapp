import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createEvolutionClient } from '@/lib/evolution/client';

export async function GET(request: NextRequest) {
  try {
    const instanceId = request.nextUrl.searchParams.get('instanceId');

    if (!instanceId) {
      return NextResponse.json(
        { error: 'Instance ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get the user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the WhatsApp instance
    const { data: instance, error: instanceError } = await supabase
      .from('whatsapp_instances')
      .select('*, businesses!inner(*)')
      .eq('id', instanceId)
      .eq('businesses.user_id', user.id)
      .single();

    if (instanceError || !instance) {
      return NextResponse.json(
        { error: 'Instance not found or access denied' },
        { status: 404 }
      );
    }

    // Create Evolution API client
    const evolutionClient = createEvolutionClient(
      instance.api_url,
      instance.api_key,
      instance.instance_name
    );

    try {
      const statusData = await evolutionClient.getInstanceStatus();

      const isConnected = statusData.instance?.state === 'open';
      const newStatus = isConnected ? 'connected' : 'disconnected';

      // Update database if status changed
      if (instance.status !== newStatus) {
        await supabase
          .from('whatsapp_instances')
          .update({
            status: newStatus,
            phone_number: statusData.instance?.owner || instance.phone_number,
          })
          .eq('id', instance.id);
      }

      // Setup webhook if connected and not already set
      if (isConnected) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const webhookUrl = `${appUrl}/api/webhook/evolution`;

        try {
          await evolutionClient.setWebhook(webhookUrl);
        } catch (webhookError) {
          console.error('Error setting webhook:', webhookError);
        }
      }

      return NextResponse.json({
        status: newStatus,
        connected: isConnected,
        phoneNumber: statusData.instance?.owner || instance.phone_number,
      });
    } catch (evolutionError: any) {
      console.error('Evolution API error:', evolutionError);

      return NextResponse.json(
        {
          error: 'Error checking Evolution API status',
          details: evolutionError.message || 'Unknown error',
        },
        { status: 502 }
      );
    }
  } catch (error: any) {
    console.error('Status check error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
