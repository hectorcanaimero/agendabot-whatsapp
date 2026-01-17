import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createEvolutionClient } from '@/lib/evolution/client';

export async function POST(request: NextRequest) {
  try {
    const { instanceId } = await request.json();

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

    // Get the WhatsApp instance with business verification
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
      // First check if instance exists, if not create it
      let instanceStatus;
      try {
        instanceStatus = await evolutionClient.getInstanceStatus();
      } catch (statusError) {
        // Instance doesn't exist, create it
        await evolutionClient.createInstance(instance.instance_name);
      }

      // Get QR code
      const qrData = await evolutionClient.getQRCode();

      // Extract QR code from various possible response formats
      const qrCodeBase64 =
        qrData.base64 ||
        qrData.qrcode?.base64 ||
        qrData.qr ||
        qrData.code ||
        null;

      if (!qrCodeBase64 && qrData.instance?.state !== 'open') {
        return NextResponse.json(
          {
            error: 'Could not retrieve QR code',
            details: 'Evolution API did not return a QR code. The instance might already be connected or there was an error.',
            rawResponse: qrData,
          },
          { status: 500 }
        );
      }

      // Update instance status
      if (qrCodeBase64) {
        await supabase
          .from('whatsapp_instances')
          .update({
            status: 'connecting',
            qr_code: qrCodeBase64,
          })
          .eq('id', instance.id);
      }

      return NextResponse.json({
        success: true,
        qrCode: qrCodeBase64,
        status: qrData.instance?.state || 'connecting',
      });
    } catch (evolutionError: any) {
      console.error('Evolution API error:', evolutionError);

      return NextResponse.json(
        {
          error: 'Error connecting to Evolution API',
          details: evolutionError.message || 'Unknown error',
          hint: 'Check your Evolution API URL and API Key',
        },
        { status: 502 }
      );
    }
  } catch (error: any) {
    console.error('Connect WhatsApp error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
