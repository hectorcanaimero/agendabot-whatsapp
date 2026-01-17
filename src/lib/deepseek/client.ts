import OpenAI from 'openai';
import type { DeepSeekMessage, AgentContext, Service, WorkingHours } from '@/types';
import { format, addDays, parse, isWithinInterval, setHours, setMinutes } from 'date-fns';
import { es } from 'date-fns/locale';

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com',
});

function generateSystemPrompt(context: AgentContext): string {
  const basePrompt = `Eres un asistente virtual de atención al cliente para "${context.businessName}". Tu función principal es ayudar a los clientes a agendar citas.

INFORMACIÓN DEL NEGOCIO:
- Nombre: ${context.businessName}
- Duración base de citas: ${context.appointmentDuration} minutos

SERVICIOS DISPONIBLES:
${context.services.map((s: Service) => `- ${s.name}${s.description ? `: ${s.description}` : ''}${s.duration ? ` (${s.duration} min)` : ''}${s.price ? ` - $${s.price}` : ''}`).join('\n')}

HORARIOS DE ATENCIÓN:
${formatWorkingHours(context.workingHours)}

HORARIOS DISPONIBLES PARA AGENDAR:
${context.availableSlots.length > 0 ? context.availableSlots.join('\n') : 'No hay horarios disponibles en este momento.'}

INSTRUCCIONES:
1. Saluda amablemente al cliente
2. Pregunta qué servicio necesita
3. Ofrece los horarios disponibles
4. Confirma la cita con fecha, hora y servicio
5. Solicita el nombre del cliente para confirmar

FORMATO DE RESPUESTA PARA AGENDAR:
Cuando el cliente confirme una cita, responde EXACTAMENTE con este formato JSON al final de tu mensaje:
[APPOINTMENT_DATA]{"action":"schedule","date":"YYYY-MM-DD","time":"HH:mm","service":"nombre_servicio","client_name":"nombre_cliente"}[/APPOINTMENT_DATA]

FORMATO PARA CANCELAR:
[APPOINTMENT_DATA]{"action":"cancel","date":"YYYY-MM-DD","time":"HH:mm"}[/APPOINTMENT_DATA]

FORMATO PARA CONSULTAR DISPONIBILIDAD:
[APPOINTMENT_DATA]{"action":"check_availability","date":"YYYY-MM-DD"}[/APPOINTMENT_DATA]

Mantén un tono profesional pero amigable. Responde siempre en español.`;

  // Append custom prompt if exists
  if (context.customPrompt) {
    return `${basePrompt}

INSTRUCCIONES ADICIONALES DEL NEGOCIO:
${context.customPrompt}

IMPORTANTE: Las instrucciones adicionales complementan pero NO reemplazan las funciones principales de agendamiento. Siempre mantén la capacidad de agendar, cancelar y consultar citas.`;
  }

  return basePrompt;
}

function formatWorkingHours(hours: WorkingHours[]): string {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return hours
    .filter((h) => h.is_active)
    .map((h) => `- ${days[h.day_of_week]}: ${h.start_time} - ${h.end_time}`)
    .join('\n');
}

export async function generateAgentResponse(
  messages: DeepSeekMessage[],
  context: AgentContext
): Promise<string> {
  const systemPrompt = generateSystemPrompt(context);

  const response = await deepseek.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    temperature: 0.7,
    max_tokens: 1000,
  });

  return response.choices[0]?.message?.content || 'Lo siento, no pude procesar tu mensaje.';
}

export function parseAppointmentData(response: string): {
  action: 'schedule' | 'cancel' | 'check_availability';
  date?: string;
  time?: string;
  service?: string;
  client_name?: string;
} | null {
  const match = response.match(/\[APPOINTMENT_DATA\]([\s\S]*?)\[\/APPOINTMENT_DATA\]/);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch {
      return null;
    }
  }
  return null;
}

export function cleanResponseForUser(response: string): string {
  return response.replace(/\[APPOINTMENT_DATA\][\s\S]*?\[\/APPOINTMENT_DATA\]/, '').trim();
}

export function generateAvailableSlots(
  workingHours: WorkingHours[],
  appointmentDuration: number,
  existingAppointments: { start_time: string; end_time: string }[],
  daysAhead: number = 7
): string[] {
  const slots: string[] = [];
  const now = new Date();

  for (let i = 0; i < daysAhead; i++) {
    const date = addDays(now, i);
    const dayOfWeek = date.getDay();
    const dayHours = workingHours.find((h) => h.day_of_week === dayOfWeek && h.is_active);

    if (!dayHours) continue;

    const [startHour, startMin] = dayHours.start_time.split(':').map(Number);
    const [endHour, endMin] = dayHours.end_time.split(':').map(Number);

    let currentTime = setMinutes(setHours(date, startHour), startMin);
    const endTime = setMinutes(setHours(date, endHour), endMin);

    while (currentTime < endTime) {
      const slotEnd = new Date(currentTime.getTime() + appointmentDuration * 60000);
      
      // Check if slot is in the future
      if (currentTime > now) {
        // Check if slot conflicts with existing appointments
        const hasConflict = existingAppointments.some((apt) => {
          const aptStart = new Date(apt.start_time);
          const aptEnd = new Date(apt.end_time);
          return (
            (currentTime >= aptStart && currentTime < aptEnd) ||
            (slotEnd > aptStart && slotEnd <= aptEnd) ||
            (currentTime <= aptStart && slotEnd >= aptEnd)
          );
        });

        if (!hasConflict) {
          slots.push(
            `${format(date, "EEEE d 'de' MMMM", { locale: es })} a las ${format(currentTime, 'HH:mm')}`
          );
        }
      }

      currentTime = new Date(currentTime.getTime() + appointmentDuration * 60000);
    }
  }

  return slots.slice(0, 10); // Return max 10 slots
}
