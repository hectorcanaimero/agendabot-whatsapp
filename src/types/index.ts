// Database types
export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Business {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  phone?: string;
  address?: string;
  timezone: string;
  appointment_duration: number; // in minutes
  created_at: string;
  updated_at: string;
}

export interface WorkingHours {
  id: string;
  business_id: string;
  day_of_week: number; // 0 = Sunday, 6 = Saturday
  start_time: string; // HH:mm format
  end_time: string; // HH:mm format
  is_active: boolean;
  created_at: string;
}

export interface WhatsAppInstance {
  id: string;
  business_id: string;
  instance_name: string;
  instance_id: string;
  api_url: string;
  api_key: string;
  status: 'connected' | 'disconnected' | 'connecting';
  qr_code?: string;
  phone_number?: string;
  created_at: string;
  updated_at: string;
}

export interface GoogleCalendarConnection {
  id: string;
  business_id: string;
  access_token: string;
  refresh_token: string;
  token_expiry: string;
  calendar_id: string;
  created_at: string;
  updated_at: string;
}

export interface AgentConfig {
  id: string;
  business_id: string;
  base_prompt: string;
  custom_prompt?: string;
  welcome_message: string;
  services: Service[];
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  duration: number; // in minutes
  price?: number;
}

export interface Conversation {
  id: string;
  business_id: string;
  whatsapp_instance_id: string;
  contact_phone: string;
  contact_name?: string;
  status: 'active' | 'closed' | 'pending';
  last_message_at: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  content: string;
  type: 'text' | 'image' | 'audio' | 'document';
  direction: 'inbound' | 'outbound';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  created_at: string;
}

export interface Appointment {
  id: string;
  business_id: string;
  conversation_id?: string;
  contact_phone: string;
  contact_name?: string;
  service_name?: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  google_event_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Evolution API types
export interface EvolutionWebhookPayload {
  event: string;
  instance: string;
  data: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
    };
    pushName?: string;
    message?: {
      conversation?: string;
      extendedTextMessage?: {
        text: string;
      };
    };
    messageType?: string;
    messageTimestamp?: number;
  };
}

export interface EvolutionSendMessagePayload {
  number: string;
  text: string;
}

// DeepSeek types
export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AgentContext {
  businessName: string;
  services: Service[];
  workingHours: WorkingHours[];
  appointmentDuration: number;
  availableSlots: string[];
  customPrompt?: string;
}
