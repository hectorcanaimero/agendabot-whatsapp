import OpenAI from 'openai';
import type { DeepSeekMessage, AgentContext, Service, WorkingHours } from '@/types';
import { format, addDays, parse, isWithinInterval, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com',
});

function generateSystemPrompt(context: AgentContext): string {
  const basePrompt = `Você é um assistente virtual de atendimento ao cliente para "${context.businessName}". Sua função principal é ajudar os clientes a agendar consultas.

INFORMAÇÕES DO NEGÓCIO:
- Nome: ${context.businessName}
- Duração base das consultas: ${context.appointmentDuration} minutos

SERVIÇOS DISPONÍVEIS:
${context.services.map((s: Service) => `- ${s.name}${s.description ? `: ${s.description}` : ''}${s.duration ? ` (${s.duration} min)` : ''}${s.price ? ` - R$${s.price}` : ''}`).join('\n')}

HORÁRIOS DE ATENDIMENTO:
${formatWorkingHours(context.workingHours)}

HORÁRIOS DISPONÍVEIS PARA AGENDAR:
${context.availableSlots.length > 0 ? context.availableSlots.join('\n') : 'Não há horários disponíveis no momento.'}

INSTRUÇÕES:
1. Cumprimente o cliente cordialmente
2. Pergunte qual serviço ele precisa
3. Ofereça os horários disponíveis
4. Confirme o agendamento com data, hora e serviço
5. Solicite o nome do cliente para confirmar

FORMATO DE RESPOSTA PARA AGENDAR:
Quando o cliente confirmar um agendamento, responda EXATAMENTE com este formato JSON no final da sua mensagem:
[APPOINTMENT_DATA]{"action":"schedule","date":"YYYY-MM-DD","time":"HH:mm","service":"nome_servico","client_name":"nome_cliente"}[/APPOINTMENT_DATA]

FORMATO PARA CANCELAR:
[APPOINTMENT_DATA]{"action":"cancel","date":"YYYY-MM-DD","time":"HH:mm"}[/APPOINTMENT_DATA]

FORMATO PARA CONSULTAR DISPONIBILIDADE:
[APPOINTMENT_DATA]{"action":"check_availability","date":"YYYY-MM-DD"}[/APPOINTMENT_DATA]

Mantenha um tom profissional mas amigável. Responda sempre em português do Brasil.`;

  // Append custom prompt if exists
  if (context.customPrompt) {
    return `${basePrompt}

INSTRUÇÕES ADICIONAIS DO NEGÓCIO:
${context.customPrompt}

IMPORTANTE: As instruções adicionais complementam mas NÃO substituem as funções principais de agendamento. Sempre mantenha a capacidade de agendar, cancelar e consultar agendamentos.`;
  }

  return basePrompt;
}

function formatWorkingHours(hours: WorkingHours[]): string {
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
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

  return response.choices[0]?.message?.content || 'Desculpe, não consegui processar sua mensagem.';
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
            `${format(date, "EEEE, d 'de' MMMM", { locale: ptBR })} às ${format(currentTime, 'HH:mm')}`
          );
        }
      }

      currentTime = new Date(currentTime.getTime() + appointmentDuration * 60000);
    }
  }

  return slots.slice(0, 10); // Return max 10 slots
}
