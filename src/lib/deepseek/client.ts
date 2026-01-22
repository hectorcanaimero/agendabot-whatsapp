import OpenAI from 'openai';
import type { DeepSeekMessage, AgentContext, Service, WorkingHours } from '@/types';
import { format, addDays, parse, parseISO, isWithinInterval, setHours, setMinutes, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createClient } from '@/lib/supabase/server';
import { searchDocuments, buildContextFromResults } from '@/lib/embeddings/search';

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com',
});

// Tool definitions for function calling
const tools = [
  {
    type: 'function' as const,
    function: {
      name: 'check_availability',
      description: 'Consulta os horários disponíveis para agendamento em uma data específica ou nos próximos dias',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Data para verificar disponibilidade no formato YYYY-MM-DD. Se não especificado, busca nos próximos 7 dias',
          },
          service_name: {
            type: 'string',
            description: 'Nome do serviço para o qual deseja verificar disponibilidade (opcional)',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_appointment',
      description: 'Cria um novo agendamento quando o cliente confirma data, hora e serviço',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Data do agendamento no formato YYYY-MM-DD',
          },
          time: {
            type: 'string',
            description: 'Hora do agendamento no formato HH:mm',
          },
          service_name: {
            type: 'string',
            description: 'Nome do serviço solicitado',
          },
          client_name: {
            type: 'string',
            description: 'Nome completo do cliente',
          },
        },
        required: ['date', 'time', 'service_name', 'client_name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'cancel_appointment',
      description: 'Cancela um agendamento existente',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Data do agendamento a cancelar no formato YYYY-MM-DD',
          },
          time: {
            type: 'string',
            description: 'Hora do agendamento a cancelar no formato HH:mm',
          },
        },
        required: ['date', 'time'],
      },
    },
  },
];

function generateSystemPrompt(
  context: AgentContext,
  agentMode: 'support' | 'scheduling' | 'hybrid' = 'scheduling',
  knowledgeContext: string = ''
): string {
  const agentName = context.agentName || 'Assistente';
  
  // Support mode - only answer from knowledge base
  if (agentMode === 'support') {
    return `Você é ${agentName}, um assistente virtual de atendimento ao cliente para "${context.businessName}".

Sua função é responder perguntas dos clientes com base na base de conhecimento fornecida.

${knowledgeContext}

INSTRUÇÕES:
1. Responda apenas com base nas informações fornecidas acima
2. Se não souber a resposta, seja honesto e sugira entrar em contato direto
3. Seja claro, objetivo e profissional
4. Cite a fonte quando relevante

${context.customPrompt ? `INSTRUÇÕES ADICIONAIS:
${context.customPrompt}

` : ''}Responda sempre em português do Brasil.`;
  }
  
  // Hybrid mode - both support and scheduling
  if (agentMode === 'hybrid') {
    return `Você é ${agentName}, um assistente virtual completo de atendimento ao cliente para "${context.businessName}".

Você pode:
1. Responder perguntas usando a base de conhecimento
2. Agendar consultas e gerenciar horários

${knowledgeContext ? `${knowledgeContext}

` : ''}INFORMAÇÕES DO NEGÓCIO:
- Nome: ${context.businessName}
- Duração base das consultas: ${context.appointmentDuration} minutos

SERVIÇOS DISPONÍVEIS:
${context.services.map((s: Service) => `- ${s.name}${s.description ? `: ${s.description}` : ''}${s.duration ? ` (${s.duration} min)` : ''}${s.price ? ` - R$${s.price}` : ''}`).join('\n')}

HORÁRIOS DE ATENDIMENTO:
${formatWorkingHours(context.workingHours)}

INSTRUÇÕES:
1. Se o cliente fizer uma pergunta, use a base de conhecimento para responder
2. Se o cliente quiser agendar, use as ferramentas de agendamento
3. Seja proativo - ofereça ajuda para agendar após responder perguntas
4. Use check_availability quando o cliente mencionar datas
5. Confirme todos os detalhes antes de criar agendamento

${context.customPrompt ? `INSTRUÇÕES ADICIONAIS:
${context.customPrompt}

` : ''}Responda sempre em português do Brasil.`;
  }
  
  // Scheduling mode (default) - only scheduling
  const basePrompt = `Você é ${agentName}, um assistente virtual de atendimento ao cliente para "${context.businessName}". Sua função principal é ajudar os clientes a agendar consultas de forma eficiente e amigável.

INFORMAÇÕES DO NEGÓCIO:
- Nome: ${context.businessName}
- Duração base das consultas: ${context.appointmentDuration} minutos

SERVIÇOS DISPONÍVEIS:
${context.services.map((s: Service) => `- ${s.name}${s.description ? `: ${s.description}` : ''}${s.duration ? ` (${s.duration} min)` : ''}${s.price ? ` - R$${s.price}` : ''}`).join('\n')}

HORÁRIOS DE ATENDIMENTO:
${formatWorkingHours(context.workingHours)}

INSTRUÇÕES DE COMPORTAMENTO:
1. Seja proativo e assertivo - não espere o cliente pedir, ofereça opções
2. Use as ferramentas disponíveis para consultar disponibilidade em tempo real
3. Quando o cliente mencionar uma data (hoje, amanhã, segunda-feira, etc), use check_availability imediatamente
4. Confirme todos os detalhes antes de criar o agendamento
5. Seja natural e conversacional, evite respostas muito longas

FLUXO DE AGENDAMENTO:
1. Cumprimente e identifique a necessidade
2. Se o cliente mencionar uma data/período, consulte disponibilidade automaticamente
3. Apresente as opções de forma clara e objetiva
4. Confirme: serviço, data, hora e nome do cliente
5. Crie o agendamento usando create_appointment

IMPORTANTE:
- Use check_availability SEMPRE que o cliente mencionar uma data ou período
- NÃO invente horários - sempre consulte a disponibilidade real
- Seja específico com datas e horários
- Confirme o nome do cliente antes de finalizar

Mantenha um tom profissional mas amigável. Responda sempre em português do Brasil.`;

  // Append custom prompt if exists
  if (context.customPrompt) {
    return `${basePrompt}

INSTRUÇÕES ADICIONAIS DO NEGÓCIO:
${context.customPrompt}

IMPORTANTE: As instruções adicionais complementam mas NÃO substituem as funções principais de agendamento. Sempre mantenha a capacidade de agendar, cancelar e consultar agendamentos usando as ferramentas disponíveis.`;
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

// Function to check availability in database
async function checkAvailabilityInDB(
  businessId: string,
  date?: string,
  serviceName?: string,
  context?: AgentContext
): Promise<string[]> {
  const supabase = await createClient();
  const slots: string[] = [];
  const now = new Date();
  
  // Determine date range
  const startDate = date ? parseISO(date) : now;
  const daysToCheck = date ? 1 : 7;
  
  for (let i = 0; i < daysToCheck; i++) {
    const checkDate = addDays(startDate, i);
    const dayOfWeek = checkDate.getDay();
    
    // Get working hours for this day
    const dayHours = context?.workingHours.find((h) => h.day_of_week === dayOfWeek && h.is_active);
    if (!dayHours) continue;
    
    // Get existing appointments for this day
    const { data: appointments } = await supabase
      .from('appointments')
      .select('start_time, end_time')
      .eq('business_id', businessId)
      .gte('start_time', startOfDay(checkDate).toISOString())
      .lte('start_time', endOfDay(checkDate).toISOString())
      .in('status', ['scheduled', 'confirmed']);
    
    // Generate time slots
    const [startHour, startMin] = dayHours.start_time.split(':').map(Number);
    const [endHour, endMin] = dayHours.end_time.split(':').map(Number);
    
    let currentTime = setMinutes(setHours(checkDate, startHour), startMin);
    const endTime = setMinutes(setHours(checkDate, endHour), endMin);
    
    // Get duration for specific service or use default
    let duration = context?.appointmentDuration || 30;
    if (serviceName && context?.services) {
      const service = context.services.find(s => s.name.toLowerCase() === serviceName.toLowerCase());
      if (service?.duration) {
        duration = service.duration;
      }
    }
    
    while (currentTime < endTime) {
      const slotEnd = new Date(currentTime.getTime() + duration * 60000);
      
      // Check if slot is in the future
      if (currentTime > now) {
        // Check if slot conflicts with existing appointments
        const hasConflict = appointments?.some((apt) => {
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
            `${format(checkDate, "EEEE, d 'de' MMMM", { locale: ptBR })} às ${format(currentTime, 'HH:mm')}`
          );
        }
      }
      
      currentTime = new Date(currentTime.getTime() + duration * 60000);
    }
  }
  
  return slots.slice(0, 10); // Return max 10 slots
}

// Execute tool calls
async function executeTool(
  toolName: string,
  args: any,
  context: AgentContext
): Promise<string> {
  switch (toolName) {
    case 'check_availability': {
      const slots = await checkAvailabilityInDB(
        context.businessId,
        args.date,
        args.service_name,
        context
      );
      
      if (slots.length === 0) {
        return 'Não há horários disponíveis para a data solicitada. Sugira datas alternativas.';
      }
      
      return `Horários disponíveis:\n${slots.join('\n')}`;
    }
    
    case 'create_appointment': {
      return JSON.stringify({
        action: 'schedule',
        date: args.date,
        time: args.time,
        service: args.service_name,
        client_name: args.client_name,
      });
    }
    
    case 'cancel_appointment': {
      return JSON.stringify({
        action: 'cancel',
        date: args.date,
        time: args.time,
      });
    }
    
    default:
      return 'Ferramenta não reconhecida.';
  }
}

export async function generateAgentResponse(
  messages: DeepSeekMessage[],
  context: AgentContext & { agentMode?: 'support' | 'scheduling' | 'hybrid' }
): Promise<string> {
  // Get agent mode (default to scheduling for backward compatibility)
  const agentMode = context.agentMode || 'scheduling';
  
  // For support or hybrid mode, search knowledge base
  let knowledgeContext = '';
  if (agentMode === 'support' || agentMode === 'hybrid') {
    const lastUserMessage = messages.filter(m => m.role === 'user').slice(-1)[0];
    if (lastUserMessage) {
      const searchResults = await searchDocuments(
        context.businessId,
        lastUserMessage.content,
        5,
        0.7
      );
      if (searchResults.length > 0) {
        knowledgeContext = buildContextFromResults(searchResults);
      }
    }
  }
  
  const systemPrompt = generateSystemPrompt(context, agentMode, knowledgeContext);
  
  let currentMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...messages,
  ];
  
  // Determine which tools to use based on mode
  const availableTools = agentMode === 'support' ? [] : tools;
  
  // Allow up to 3 tool calls in a conversation turn
  for (let i = 0; i < 3; i++) {
    const response = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: currentMessages,
      tools: availableTools.length > 0 ? availableTools : undefined,
      tool_choice: availableTools.length > 0 ? 'auto' : undefined,
      temperature: 0.7,
      max_tokens: 1000,
    });
    
    const choice = response.choices[0];
    
    if (!choice.message.tool_calls) {
      // No tool calls, return the response
      return choice.message.content || 'Desculpe, não consegui processar sua mensagem.';
    }
    
    // Execute tool calls
    currentMessages.push(choice.message as any);
    
    for (const toolCall of choice.message.tool_calls) {
      const tc = toolCall as any;
      const toolResult = await executeTool(
        tc.function.name,
        JSON.parse(tc.function.arguments),
        context
      );
      
      currentMessages.push({
        role: 'tool' as const,
        tool_call_id: toolCall.id,
        content: toolResult,
      });
    }
  }
  
  // Final response after tool calls
  const finalResponse = await deepseek.chat.completions.create({
    model: 'deepseek-chat',
    messages: currentMessages,
    temperature: 0.7,
    max_tokens: 1000,
  });
  
  return finalResponse.choices[0]?.message?.content || 'Desculpe, não consegui processar sua mensagem.';
}

export function parseAppointmentData(response: string): {
  action: 'schedule' | 'cancel' | 'check_availability';
  date?: string;
  time?: string;
  service?: string;
  client_name?: string;
} | null {
  // Try to parse JSON from tool response
  try {
    const parsed = JSON.parse(response);
    if (parsed.action) {
      return parsed;
    }
  } catch {
    // Not JSON, continue to legacy format
  }
  
  // Legacy format for backward compatibility
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
