import OpenAI from 'openai';
import type { DeepSeekMessage, AgentContext, Service, WorkingHours } from '@/types';
import { format, addDays, setHours, setMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { getLocalizedSystemPrompt, type SupportedLanguage } from '@/lib/i18n/languages';

// Validate API key
if (!process.env.DEEPSEEK_API_KEY) {
  throw new Error('DEEPSEEK_API_KEY is not configured');
}

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com',
});

/**
 * Retry configuration
 */
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

/**
 * Sleep utility for retries
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Exponential backoff retry wrapper
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
  delay = INITIAL_RETRY_DELAY
): Promise<T> {
  try {
    return await fn();
  } catch (error: unknown) {
    if (retries === 0) {
      throw error;
    }

    const err = error as { status?: number; code?: string; message?: string };

    // Check if error is retryable (5xx errors, rate limits, network errors)
    const isRetryable =
      (err.status !== undefined && err.status >= 500) ||
      err.status === 429 ||
      err.code === 'ECONNRESET' ||
      err.code === 'ETIMEDOUT';

    if (!isRetryable) {
      throw error;
    }

    console.warn(
      `DeepSeek API error, retrying in ${delay}ms... (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`,
      err.message
    );

    await sleep(delay);
    return withRetry(fn, retries - 1, delay * 2); // Exponential backoff
  }
}

function generateSystemPrompt(context: AgentContext, language: SupportedLanguage = 'es'): string {
  const languageInstruction = getLocalizedSystemPrompt(language);

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

Mantén un tono profesional pero amigable. ${languageInstruction}`;

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
  context: AgentContext,
  language: SupportedLanguage = 'es'
): Promise<string> {
  const systemPrompt = generateSystemPrompt(context, language);

  try {
    const response = await withRetry(() =>
      deepseek.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 1000,
      })
    );

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error('DeepSeek returned empty response');
    }

    return content;
  } catch (error) {
    console.error('DeepSeek API error after retries:', error);

    // Return error message in the detected language
    const errorMessages = {
      es: 'Lo siento, tengo problemas para procesar tu mensaje en este momento. Por favor, intenta de nuevo en unos momentos.',
      en: 'Sorry, I\'m having trouble processing your message right now. Please try again in a few moments.',
      pt: 'Desculpe, estou com problemas para processar sua mensagem agora. Por favor, tente novamente em alguns momentos.',
    };

    return errorMessages[language];
  }
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
  daysAhead: number = 7,
  bufferMinutes: number = 0 // Buffer time between appointments
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
      const slotEndWithBuffer = new Date(slotEnd.getTime() + bufferMinutes * 60000);

      // Check if slot fits completely within working hours (including buffer)
      if (slotEndWithBuffer > endTime) {
        break; // Slot doesn't fit in working hours
      }

      // Check if slot is in the future (at least 1 hour from now to allow preparation)
      const minFutureTime = new Date(now.getTime() + 60 * 60000);
      if (currentTime > minFutureTime) {
        // Check if slot conflicts with existing appointments (including buffer)
        const hasConflict = existingAppointments.some((apt) => {
          const aptStart = new Date(apt.start_time);
          const aptEnd = new Date(apt.end_time);
          const aptEndWithBuffer = new Date(aptEnd.getTime() + bufferMinutes * 60000);

          return (
            (currentTime >= aptStart && currentTime < aptEndWithBuffer) ||
            (slotEndWithBuffer > aptStart && slotEndWithBuffer <= aptEndWithBuffer) ||
            (currentTime <= aptStart && slotEndWithBuffer >= aptEndWithBuffer)
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

/**
 * Validate appointment data before creating
 */
export function validateAppointmentData(
  appointmentData: {
    action: string;
    date?: string;
    time?: string;
    service?: string;
    client_name?: string;
  },
  context: {
    availableSlots: string[];
    services: Service[];
    workingHours: WorkingHours[];
  }
): { valid: boolean; error?: string } {
  // Validate required fields for schedule action
  if (appointmentData.action === 'schedule') {
    if (!appointmentData.date) {
      return { valid: false, error: 'Fecha no especificada' };
    }
    if (!appointmentData.time) {
      return { valid: false, error: 'Hora no especificada' };
    }
    if (!appointmentData.client_name) {
      return { valid: false, error: 'Nombre del cliente no especificado' };
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(appointmentData.date)) {
      return { valid: false, error: 'Formato de fecha inválido (debe ser YYYY-MM-DD)' };
    }

    // Validate time format
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(appointmentData.time)) {
      return { valid: false, error: 'Formato de hora inválido (debe ser HH:mm)' };
    }

    // Validate date is in the future
    const appointmentDate = new Date(`${appointmentData.date}T${appointmentData.time}`);
    const now = new Date();
    if (appointmentDate <= now) {
      return { valid: false, error: 'La fecha debe ser en el futuro' };
    }

    // Validate day is within working hours
    const dayOfWeek = appointmentDate.getDay();
    const hasWorkingHours = context.workingHours.some(
      (h) => h.day_of_week === dayOfWeek && h.is_active
    );
    if (!hasWorkingHours) {
      return { valid: false, error: 'El día seleccionado no está disponible para citas' };
    }

    // Validate service exists (if specified)
    if (appointmentData.service && context.services.length > 0) {
      const serviceExists = context.services.some(
        (s) => s.name.toLowerCase() === appointmentData.service?.toLowerCase()
      );
      if (!serviceExists) {
        return { valid: false, error: `El servicio "${appointmentData.service}" no existe` };
      }
    }
  }

  // Validate required fields for cancel action
  if (appointmentData.action === 'cancel') {
    if (!appointmentData.date) {
      return { valid: false, error: 'Fecha no especificada para cancelar' };
    }
    if (!appointmentData.time) {
      return { valid: false, error: 'Hora no especificada para cancelar' };
    }
  }

  return { valid: true };
}
