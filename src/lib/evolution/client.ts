import type { EvolutionSendMessagePayload } from '@/types';

export class EvolutionClient {
  private apiUrl: string;
  private apiKey: string;
  private instanceName: string;

  constructor(apiUrl: string, apiKey: string, instanceName: string) {
    this.apiUrl = apiUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
    this.instanceName = instanceName;
  }

  private async request<T>(
    endpoint: string,
    method: string = 'GET',
    body?: unknown
  ): Promise<T> {
    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        apikey: this.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Evolution API Error: ${error}`);
    }

    return response.json();
  }

  // Instance management
  async createInstance(instanceName: string) {
    return this.request('/instance/create', 'POST', {
      instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
    });
  }

  async getInstanceStatus() {
    return this.request(`/instance/connectionState/${this.instanceName}`);
  }

  async getQRCode() {
    return this.request(`/instance/connect/${this.instanceName}`);
  }

  async logout() {
    return this.request(`/instance/logout/${this.instanceName}`, 'DELETE');
  }

  async deleteInstance() {
    return this.request(`/instance/delete/${this.instanceName}`, 'DELETE');
  }

  // Messaging
  async sendText(payload: EvolutionSendMessagePayload) {
    return this.request(`/message/sendText/${this.instanceName}`, 'POST', {
      number: payload.number,
      text: payload.text,
    });
  }

  async sendButtons(
    number: string,
    title: string,
    description: string,
    buttons: { buttonId: string; buttonText: { displayText: string } }[]
  ) {
    return this.request(`/message/sendButtons/${this.instanceName}`, 'POST', {
      number,
      title,
      description,
      buttons,
    });
  }

  async sendList(
    number: string,
    title: string,
    description: string,
    buttonText: string,
    sections: {
      title: string;
      rows: { title: string; description?: string; rowId: string }[];
    }[]
  ) {
    return this.request(`/message/sendList/${this.instanceName}`, 'POST', {
      number,
      title,
      description,
      buttonText,
      sections,
    });
  }

  // Webhook management
  async setWebhook(webhookUrl: string) {
    return this.request(`/webhook/set/${this.instanceName}`, 'POST', {
      webhook: {
        enabled: true,
        url: webhookUrl,
        webhookByEvents: false,
        webhookBase64: false,
        events: [
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'CONNECTION_UPDATE',
          'QRCODE_UPDATED',
        ],
      },
    });
  }

  async getWebhook() {
    return this.request(`/webhook/find/${this.instanceName}`);
  }
}

export function createEvolutionClient(instanceName: string) {
  const apiUrl = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_TOKEN;

  if (!apiUrl || !apiKey) {
    throw new Error('Evolution API credentials not configured in environment variables');
  }

  return new EvolutionClient(apiUrl, apiKey, instanceName);
}
