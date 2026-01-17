/**
 * Multi-language support for the AI agent
 */

export type SupportedLanguage = 'es' | 'en' | 'pt';

export const translations = {
  es: {
    greeting: 'Hola',
    availableSlots: 'Horarios disponibles',
    noSlots: 'Lo siento, no hay horarios disponibles',
    notWorkingDay: 'Lo siento, no atendemos los',
    validationError: 'Por favor, intenta nuevamente',
    appointmentConfirmed: 'Cita confirmada',
    appointmentCancelled: 'Cita cancelada',
    errorProcessing: 'Lo siento, tengo problemas para procesar tu mensaje en este momento. Por favor, intenta de nuevo en unos momentos.',
  },
  en: {
    greeting: 'Hello',
    availableSlots: 'Available slots',
    noSlots: 'Sorry, no slots available',
    notWorkingDay: 'Sorry, we are not open on',
    validationError: 'Please try again',
    appointmentConfirmed: 'Appointment confirmed',
    appointmentCancelled: 'Appointment cancelled',
    errorProcessing: 'Sorry, I\'m having trouble processing your message right now. Please try again in a few moments.',
  },
  pt: {
    greeting: 'Olá',
    availableSlots: 'Horários disponíveis',
    noSlots: 'Desculpe, não há horários disponíveis',
    notWorkingDay: 'Desculpe, não atendemos aos',
    validationError: 'Por favor, tente novamente',
    appointmentConfirmed: 'Consulta confirmada',
    appointmentCancelled: 'Consulta cancelada',
    errorProcessing: 'Desculpe, estou com problemas para processar sua mensagem agora. Por favor, tente novamente em alguns momentos.',
  },
};

/**
 * Detect language from message content
 */
export function detectLanguage(message: string): SupportedLanguage {
  const lowerMessage = message.toLowerCase();

  // Portuguese indicators
  const portugueseIndicators = [
    'olá', 'oi', 'tchau', 'obrigado', 'obrigada', 'por favor',
    'bom dia', 'boa tarde', 'boa noite', 'sim', 'não', 'você',
    'horário', 'disponível', 'consulta', 'agendamento',
  ];

  // English indicators
  const englishIndicators = [
    'hello', 'hi', 'bye', 'thank', 'please', 'good morning',
    'good afternoon', 'good evening', 'yes', 'no', 'you',
    'schedule', 'appointment', 'available', 'booking',
  ];

  // Spanish indicators (default)
  const spanishIndicators = [
    'hola', 'buenos días', 'buenas tardes', 'buenas noches',
    'gracias', 'por favor', 'sí', 'adiós', 'cita', 'horario',
  ];

  // Count matches
  const ptMatches = portugueseIndicators.filter((word) => lowerMessage.includes(word)).length;
  const enMatches = englishIndicators.filter((word) => lowerMessage.includes(word)).length;
  const esMatches = spanishIndicators.filter((word) => lowerMessage.includes(word)).length;

  // Return language with most matches (default to Spanish)
  if (ptMatches > enMatches && ptMatches > esMatches) {
    return 'pt';
  } else if (enMatches > ptMatches && enMatches > esMatches) {
    return 'en';
  }

  return 'es'; // Default to Spanish
}

/**
 * Get translation for a key
 */
export function t(language: SupportedLanguage, key: keyof typeof translations.es): string {
  return translations[language][key] || translations.es[key];
}

/**
 * Get system prompt in the detected language
 */
export function getLocalizedSystemPrompt(language: SupportedLanguage): string {
  const prompts = {
    es: 'Responde siempre en español.',
    en: 'Always respond in English.',
    pt: 'Sempre responda em português.',
  };

  return prompts[language];
}
