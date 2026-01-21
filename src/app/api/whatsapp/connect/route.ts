import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { createEvolutionClient } from '@/lib/evolution/client';

export async function POST(request: NextRequest) {
  try {
    const { instanceName } = await request.json();

    if (!instanceName) {
      return NextResponse.json(
        { error: 'Instance name is required' },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();

    // Verify instance exists and belongs to authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const { data: instance } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('business_id', business.id)
      .eq('instance_name', instanceName)
      .single();

    if (!instance) {
      return NextResponse.json(
        { error: 'WhatsApp instance not found' },
        { status: 404 }
      );
    }

    // Create Evolution client and get QR code
    const evolutionClient = createEvolutionClient(instanceName);
    const qrData = await evolutionClient.getQRCode();

    // Update instance with QR code
    await supabase
      .from('whatsapp_instances')
      .update({
        qr_code: qrData.qrcode?.base64 || qrData.base64,
        status: 'connecting',
      })
      .eq('id', instance.id);

    return NextResponse.json({
      success: true,
      qrCode: qrData.qrcode?.base64 || qrData.base64,
    });
  } catch (error: any) {
    console.error('Error connecting WhatsApp:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to connect WhatsApp' },
      { status: 500 }
    );
  }
}
