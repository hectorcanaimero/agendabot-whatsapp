import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { createEvolutionClient } from '@/lib/evolution/client';
import {
  generateAgentResponse,
  parseAppointmentData,
  cleanResponseForUser,
  generateAvailableSlots,
  validateAppointmentData,
} from '@/lib/deepseek/client';
import {
  createCalendarEvent,
  deleteCalendarEvent,
} from '@/lib/google/calendar';
import type { EvolutionWebhookPayload, DeepSeekMessage, WorkingHours, Service } from '@/types';
import { addMinutes, format, parse } from 'date-fns';
import { es } from 'date-fns/locale';

export async function POST(request: NextRequest) {
  try {
    const payload: EvolutionWebhookPayload = await request.json();
    
    // Only process incoming messages
    if (payload.event !== 'messages.upsert' || payload.data.key.fromMe) {
      return NextResponse.json({ status: 'ignored' });
    }

    const supabase = await createServiceClient();
    const instanceName = payload.instance;
    const remoteJid = payload.data.key.remoteJid;
    const contactPhone = remoteJid.replace('@s.whatsapp.net', '');
    const contactName = payload.data.pushName || 'Cliente';
    const messageText =
      payload.data.message?.conversation ||
      payload.data.message?.extendedTextMessage?.text ||
      '';

    if (!messageText) {
      return NextResponse.json({ status: 'no_text' });
    }

    // Get WhatsApp instance
    const { data: instance } = await supabase
      .from('whatsapp_instances')
      .select('*, businesses(*)')
      .eq('instance_name', instanceName)
      .single();

    if (!instance) {
      return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
    }

    const businessId = instance.business_id;

    // Get or create conversation
    let { data: conversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('business_id', businessId)
      .eq('contact_phone', contactPhone)
      .eq('status', 'active')
      .single();

    if (!conversation) {
      const { data: newConversation } = await supabase
        .from('conversations')
        .insert({
          business_id: businessId,
          whatsapp_instance_id: instance.id,
          contact_phone: contactPhone,
          contact_name: contactName,
          status: 'active',
        })
        .select()
        .single();
      conversation = newConversation;
    }

    // Save incoming message
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      content: messageText,
      type: 'text',
      direction: 'inbound',
      status: 'delivered',
    });

    // Get conversation history
    const { data: messageHistory } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })
      .limit(20);

    // Get agent config
    const { data: agentConfig } = await supabase
      .from('agent_configs')
      .select('*')
      .eq('business_id', businessId)
      .single();

    // Get working hours
    const { data: workingHours } = await supabase
      .from('working_hours')
      .select('*')
      .eq('business_id', businessId);

    // Get existing appointments
    const { data: existingAppointments } = await supabase
      .from('appointments')
      .select('start_time, end_time')
      .eq('business_id', businessId)
      .in('status', ['scheduled', 'confirmed'])
      .gte('start_time', new Date().toISOString());

    // Generate available slots with 5-minute buffer between appointments
    const availableSlots = generateAvailableSlots(
      (workingHours || []) as WorkingHours[],
      instance.businesses?.appointment_duration || 30,
      existingAppointments || [],
      7, // days ahead
      5 // 5-minute buffer between appointments
    );

    // Build messages for AI
    const messages: DeepSeekMessage[] = (messageHistory || []).map((msg) => ({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: msg.content,
    }));

    // Generate AI response
    const aiResponse = await generateAgentResponse(messages, {
      businessName: instance.businesses?.name || 'Negocio',
      services: (agentConfig?.services || []) as Service[],
      workingHours: (workingHours || []) as WorkingHours[],
      appointmentDuration: instance.businesses?.appointment_duration || 30,
      availableSlots,
      customPrompt: agentConfig?.custom_prompt,
    });

    // Parse appointment data if present
    const appointmentData = parseAppointmentData(aiResponse);
    const cleanResponse = cleanResponseForUser(aiResponse);

    // Handle appointment actions
    if (appointmentData) {
      // Validate appointment data
      const validation = validateAppointmentData(appointmentData, {
        availableSlots,
        services: (agentConfig?.services || []) as Service[],
        workingHours: (workingHours || []) as WorkingHours[],
      });

      if (!validation.valid) {
        // Send validation error message to user
        await supabase.from('messages').insert({
          conversation_id: conversation.id,
          content: `❌ ${validation.error}. Por favor, intenta nuevamente.`,
          type: 'text',
          direction: 'outbound',
          status: 'sent',
        });

        const evolutionClient = createEvolutionClient(
          instance.api_url,
          instance.api_key,
          instance.instance_name
        );

        await evolutionClient.sendText({
          number: contactPhone,
          text: `❌ ${validation.error}. Por favor, intenta nuevamente.`,
        });

        return NextResponse.json({ status: 'validation_error', error: validation.error });
      }

      if (appointmentData.action === 'schedule' && appointmentData.date && appointmentData.time) {
        const startTime = parse(
          `${appointmentData.date} ${appointmentData.time}`,
          'yyyy-MM-dd HH:mm',
          new Date()
        );
        const endTime = addMinutes(startTime, instance.businesses?.appointment_duration || 30);

        // Create appointment
        const { data: appointment } = await supabase
          .from('appointments')
          .insert({
            business_id: businessId,
            conversation_id: conversation.id,
            contact_phone: contactPhone,
            contact_name: appointmentData.client_name || contactName,
            service_name: appointmentData.service,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            status: 'scheduled',
          })
          .select()
          .single();

        // Create Google Calendar event if connected
        const { data: calendarConnection } = await supabase
          .from('google_calendar_connections')
          .select('*')
          .eq('business_id', businessId)
          .single();

        if (calendarConnection) {
          try {
            const event = await createCalendarEvent(
              calendarConnection.access_token,
              calendarConnection.refresh_token,
              calendarConnection.calendar_id,
              {
                summary: `Cita: ${appointmentData.client_name || contactName} - ${appointmentData.service || 'Consulta'}`,
                description: `Cliente: ${appointmentData.client_name || contactName}\nTeléfono: ${contactPhone}\nServicio: ${appointmentData.service || 'Consulta'}`,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
              }
            );

            // Update appointment with Google event ID
            await supabase
              .from('appointments')
              .update({ google_event_id: event.id })
              .eq('id', appointment.id);
          } catch (error) {
            console.error('Error creating calendar event:', error);
          }
        }
      } else if (appointmentData.action === 'cancel' && appointmentData.date && appointmentData.time) {
        const startTime = parse(
          `${appointmentData.date} ${appointmentData.time}`,
          'yyyy-MM-dd HH:mm',
          new Date()
        );

        // Find and cancel appointment
        const { data: appointment } = await supabase
          .from('appointments')
          .select('*')
          .eq('business_id', businessId)
          .eq('contact_phone', contactPhone)
          .eq('start_time', startTime.toISOString())
          .single();

        if (appointment) {
          await supabase
            .from('appointments')
            .update({ status: 'cancelled' })
            .eq('id', appointment.id);

          // Delete Google Calendar event if exists
          if (appointment.google_event_id) {
            const { data: calendarConnection } = await supabase
              .from('google_calendar_connections')
              .select('*')
              .eq('business_id', businessId)
              .single();

            if (calendarConnection) {
              try {
                await deleteCalendarEvent(
                  calendarConnection.access_token,
                  calendarConnection.refresh_token,
                  calendarConnection.calendar_id,
                  appointment.google_event_id
                );
              } catch (error) {
                console.error('Error deleting calendar event:', error);
              }
            }
          }
        }
      } else if (appointmentData.action === 'check_availability' && appointmentData.date) {
        // Handle availability check for specific date
        const requestedDate = new Date(appointmentData.date);
        const dayOfWeek = requestedDate.getDay();

        // Find working hours for that day
        const dayHours = (workingHours || []).find(
          (h) => h.day_of_week === dayOfWeek && h.is_active
        );

        if (!dayHours) {
          const daysMap = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
          const availabilityMessage = `Lo siento, no atendemos los ${daysMap[dayOfWeek]}s.`;

          await supabase.from('messages').insert({
            conversation_id: conversation.id,
            content: availabilityMessage,
            type: 'text',
            direction: 'outbound',
            status: 'sent',
          });

          const evolutionClient = createEvolutionClient(
            instance.api_url,
            instance.api_key,
            instance.instance_name
          );

          await evolutionClient.sendText({
            number: contactPhone,
            text: availabilityMessage,
          });

          return NextResponse.json({ status: 'availability_checked' });
        }

        // Generate slots for that specific date
        const slotsForDate = generateAvailableSlots(
          [dayHours],
          instance.businesses?.appointment_duration || 30,
          existingAppointments || [],
          1, // Only 1 day (the requested date)
          5 // 5-minute buffer
        ).filter((slot) => slot.includes(format(requestedDate, "d 'de' MMMM", { locale: es })));

        const availabilityMessage = slotsForDate.length > 0
          ? `Horarios disponibles para ${format(requestedDate, "EEEE d 'de' MMMM", { locale: es })}:\n${slotsForDate.map((s) => `• ${s.split('a las ')[1]}`).join('\n')}`
          : `Lo siento, no hay horarios disponibles para ${format(requestedDate, "EEEE d 'de' MMMM", { locale: es })}.`;

        await supabase.from('messages').insert({
          conversation_id: conversation.id,
          content: availabilityMessage,
          type: 'text',
          direction: 'outbound',
          status: 'sent',
        });

        const evolutionClient = createEvolutionClient(
          instance.api_url,
          instance.api_key,
          instance.instance_name
        );

        await evolutionClient.sendText({
          number: contactPhone,
          text: availabilityMessage,
        });

        return NextResponse.json({ status: 'availability_checked' });
      }
    }

    // Save outgoing message
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      content: cleanResponse,
      type: 'text',
      direction: 'outbound',
      status: 'sent',
    });

    // Update conversation last message time
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversation.id);

    // Send response via Evolution API
    const evolutionClient = createEvolutionClient(
      instance.api_url,
      instance.api_key,
      instance.instance_name
    );

    await evolutionClient.sendText({
      number: contactPhone,
      text: cleanResponse,
    });

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
