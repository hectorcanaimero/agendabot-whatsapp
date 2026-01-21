"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Loader2,
  Building2,
  Clock,
  Bot,
  Smartphone,
  Calendar,
  Plus,
  Trash2,
  Save,
  QrCode,
  RefreshCw,
} from "lucide-react";

const DAYS = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda-feira" },
  { value: 2, label: "Terça-feira" },
  { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" },
  { value: 6, label: "Sábado" },
];

interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
}

interface WorkingHour {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  // Business state
  const [business, setBusiness] = useState<any>(null);
  const [businessName, setBusinessName] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [appointmentDuration, setAppointmentDuration] = useState(30);

  // Working hours state
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);

  // Agent config state
  const [agentName, setAgentName] = useState("Assistente");
  const [customPrompt, setCustomPrompt] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [services, setServices] = useState<Service[]>([]);

  // WhatsApp state
  const [whatsappInstance, setWhatsappInstance] = useState<any>(null);
  const [instanceName, setInstanceName] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [connectingWhatsApp, setConnectingWhatsApp] = useState(false);

  // Google Calendar state
  const [calendarConnected, setCalendarConnected] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load business
      const { data: businessData } = await supabase
        .from("businesses")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (businessData) {
        setBusiness(businessData);
        setBusinessName(businessData.name);
        setBusinessDescription(businessData.description || "");
        setAppointmentDuration(businessData.appointment_duration);

        // Load working hours
        const { data: hoursData } = await supabase
          .from("working_hours")
          .select("*")
          .eq("business_id", businessData.id);

        if (hoursData && hoursData.length > 0) {
          setWorkingHours(hoursData);
        } else {
          // Initialize default working hours
          setWorkingHours(
            DAYS.map((day) => ({
              day_of_week: day.value,
              start_time: "09:00",
              end_time: "18:00",
              is_active: day.value >= 1 && day.value <= 5,
            }))
          );
        }

        // Load agent config
        const { data: agentData } = await supabase
          .from("agent_configs")
          .select("*")
          .eq("business_id", businessData.id)
          .single();

        if (agentData) {
          setAgentName(agentData.agent_name || "Assistente");
          setCustomPrompt(agentData.custom_prompt || "");
          setWelcomeMessage(agentData.welcome_message || "");
          setServices(agentData.services || []);
        }

        // Load WhatsApp instance
        const { data: instanceData } = await supabase
          .from("whatsapp_instances")
          .select("*")
          .eq("business_id", businessData.id)
          .single();

        if (instanceData) {
          setWhatsappInstance(instanceData);
          setInstanceName(instanceData.instance_name);
        }

        // Check Google Calendar connection
        const { data: calendarData } = await supabase
          .from("google_calendar_connections")
          .select("*")
          .eq("business_id", businessData.id)
          .single();

        setCalendarConnected(!!calendarData);
      } else {
        // Initialize default working hours for new business
        setWorkingHours(
          DAYS.map((day) => ({
            day_of_week: day.value,
            start_time: "09:00",
            end_time: "18:00",
            is_active: day.value >= 1 && day.value <= 5,
          }))
        );
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  const saveBusiness = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let businessId = business?.id;

      if (business) {
        // Update existing business
        await supabase
          .from("businesses")
          .update({
            name: businessName,
            description: businessDescription,
            appointment_duration: appointmentDuration,
          })
          .eq("id", business.id);
      } else {
        // Create new business
        const { data: newBusiness } = await supabase
          .from("businesses")
          .insert({
            user_id: user.id,
            name: businessName,
            description: businessDescription,
            appointment_duration: appointmentDuration,
          })
          .select()
          .single();

        businessId = newBusiness?.id;
        setBusiness(newBusiness);
      }

      // Save working hours
      if (businessId) {
        // Delete existing hours
        await supabase
          .from("working_hours")
          .delete()
          .eq("business_id", businessId);

        // Insert new hours
        await supabase.from("working_hours").insert(
          workingHours.map((h) => ({
            business_id: businessId,
            day_of_week: h.day_of_week,
            start_time: h.start_time,
            end_time: h.end_time,
            is_active: h.is_active,
          }))
        );
      }

      toast.success("Configurações guardada");
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const saveAgentConfig = async () => {
    if (!business) {
      toast.error("Primero configura tu negocio");
      return;
    }

    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("agent_configs")
        .select("id")
        .eq("business_id", business.id)
        .single();

      if (existing) {
        await supabase
          .from("agent_configs")
          .update({
            agent_name: agentName,
            custom_prompt: customPrompt,
            welcome_message: welcomeMessage,
            services: services,
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("agent_configs").insert({
          business_id: business.id,
          agent_name: agentName,
          custom_prompt: customPrompt,
          welcome_message: welcomeMessage,
          services: services,
        });
      }

      toast.success("Configurações del agente guardada");
    } catch (error) {
      console.error("Error saving agent config:", error);
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const saveWhatsAppConfig = async () => {
    if (!business) {
      toast.error("Primero configura tu negocio");
      return;
    }

    setSaving(true);
    try {
      if (whatsappInstance) {
        await supabase
          .from("whatsapp_instances")
          .update({
            instance_name: instanceName,
          })
          .eq("id", whatsappInstance.id);
      } else {
        const { data: newInstance } = await supabase
          .from("whatsapp_instances")
          .insert({
            business_id: business.id,
            instance_name: instanceName,
            status: "disconnected",
          })
          .select()
          .single();

        setWhatsappInstance(newInstance);
      }

      toast.success("Configurações de WhatsApp guardada");
    } catch (error) {
      console.error("Erro ao salvar configurações do WhatsApp:", error);
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const connectWhatsApp = async () => {
    if (!instanceName) {
      toast.error("Ingresa el nombre de la instancia");
      return;
    }

    setConnectingWhatsApp(true);
    try {
      // First save the config
      await saveWhatsAppConfig();

      // Get QR code from Evolution API
      const response = await fetch(`/api/whatsapp/connect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ instanceName }),
      });

      if (!response.ok) {
        throw new Error("Error al conectar con Evolution API");
      }

      const data = await response.json();
      
      if (data.base64) {
        setQrCode(data.base64);
        toast.success("Escaneie o código QR com o WhatsApp");
      } else if (data.instance?.state === "open") {
        toast.success("WhatsApp já está conectado");
        await supabase
          .from("whatsapp_instances")
          .update({ status: "connected" })
          .eq("id", whatsappInstance?.id);
      }
    } catch (error) {
      console.error("Erro ao conectar WhatsApp:", error);
      toast.error("Erro ao conectar WhatsApp");
    } finally {
      setConnectingWhatsApp(false);
    }
  };

  const connectGoogleCalendar = () => {
    if (!business) {
      toast.error("Primero configura tu negocio");
      return;
    }
    // Redirect to Google OAuth
    window.location.href = `/api/auth/google?business_id=${business.id}`;
  };

  const addService = () => {
    setServices([
      ...services,
      {
        id: crypto.randomUUID(),
        name: "",
        description: "",
        duration: appointmentDuration,
        price: 0,
      },
    ]);
  };

  const updateService = (id: string, field: keyof Service, value: any) => {
    setServices(
      services.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const removeService = (id: string) => {
    setServices(services.filter((s) => s.id !== id));
  };

  const updateWorkingHour = (dayOfWeek: number, field: keyof WorkingHour, value: any) => {
    setWorkingHours(
      workingHours.map((h) =>
        h.day_of_week === dayOfWeek ? { ...h, [field]: value } : h
      )
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-20 lg:pb-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Configure seu negócio, horários e agente de WhatsApp
        </p>
      </div>

      <Tabs defaultValue="business" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="business" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Negócio</span>
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Horários</span>
          </TabsTrigger>
          <TabsTrigger value="agent" className="gap-2">
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline">Agente</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Smartphone className="h-4 w-4" />
            <span className="hidden sm:inline">Integraciones</span>
          </TabsTrigger>
        </TabsList>

        {/* Business Tab */}
        <TabsContent value="business">
          <Card>
            <CardHeader>
              <CardTitle>Información del Negócio</CardTitle>
              <CardDescription>
                Datos básicos de tu negocio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Nome do negócio</Label>
                <Input
                  id="businessName"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Mi Consultorio"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessDescription">Descrição</Label>
                <Textarea
                  id="businessDescription"
                  value={businessDescription}
                  onChange={(e) => setBusinessDescription(e.target.value)}
                  placeholder="Breve descripción de tu negocio..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="appointmentDuration">
                  Duração base dos agendamentos (minutos)
                </Label>
                <Input
                  id="appointmentDuration"
                  type="number"
                  min={15}
                  max={180}
                  step={15}
                  value={appointmentDuration}
                  onChange={(e) => setAppointmentDuration(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Tiempo estándar para cada cita. Puedes definir duraciones diferentes por servicio.
                </p>
              </div>

              <Button onClick={saveBusiness} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salvar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Horários de Atención</CardTitle>
              <CardDescription>
                Define los días y horarios en que atiendes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {workingHours.map((hour) => {
                const day = DAYS.find((d) => d.value === hour.day_of_week);
                return (
                  <div
                    key={hour.day_of_week}
                    className="flex items-center gap-4 p-3 border rounded-lg"
                  >
                    <Switch
                      checked={hour.is_active}
                      onCheckedChange={(checked) =>
                        updateWorkingHour(hour.day_of_week, "is_active", checked)
                      }
                    />
                    <span className="w-24 font-medium">{day?.label}</span>
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        type="time"
                        value={hour.start_time}
                        onChange={(e) =>
                          updateWorkingHour(hour.day_of_week, "start_time", e.target.value)
                        }
                        disabled={!hour.is_active}
                        className="w-32"
                      />
                      <span className="text-muted-foreground">a</span>
                      <Input
                        type="time"
                        value={hour.end_time}
                        onChange={(e) =>
                          updateWorkingHour(hour.day_of_week, "end_time", e.target.value)
                        }
                        disabled={!hour.is_active}
                        className="w-32"
                      />
                    </div>
                  </div>
                );
              })}

              <Button onClick={saveBusiness} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salvar Horários
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agent Tab */}
        <TabsContent value="agent" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Serviços</CardTitle>
              <CardDescription>
                Define los servicios que ofreces
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="p-4 border rounded-lg space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label>Nome</Label>
                        <Input
                          value={service.name}
                          onChange={(e) =>
                            updateService(service.id, "name", e.target.value)
                          }
                          placeholder="Consulta general"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Duração (min)</Label>
                        <Input
                          type="number"
                          value={service.duration}
                          onChange={(e) =>
                            updateService(service.id, "duration", Number(e.target.value))
                          }
                        />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeService(service.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <Label>Descrição</Label>
                    <Input
                      value={service.description}
                      onChange={(e) =>
                        updateService(service.id, "description", e.target.value)
                      }
                      placeholder="Descrição del servicio..."
                    />
                  </div>
                </div>
              ))}

              <Button variant="outline" onClick={addService}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Serviço
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Personalização do Agente</CardTitle>
              <CardDescription>
                Personaliza cómo responde tu agente sin perder la funcionalidad de agendamiento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="agentName">Nome do Agente</Label>
                <Input
                  id="agentName"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="Assistente"
                />
                <p className="text-xs text-muted-foreground">
                  O nome que o agente usará para se apresentar aos clientes
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="welcomeMessage">Mensagem de boas-vindas</Label>
                <Textarea
                  id="welcomeMessage"
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  placeholder="¡Hola! Bienvenido a [Tu Negócio]. ¿En qué puedo ayudarte?"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customPrompt">
                  Instrucciones adicionales para el agente
                </Label>
                <Textarea
                  id="customPrompt"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Ejemplo: Siempre menciona que ofrecemos estacionamiento gratuito. Recomienda llegar 10 minutos antes de la cita..."
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">
                  Estas instrucciones complementan el comportamiento base del agente.
                  La funcionalidad de agendamiento siempre se mantiene activa.
                </p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Funcionalidades base del agente:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ Saluda y presenta los servicios disponibles</li>
                  <li>✓ Muestra horarios disponibles para agendar</li>
                  <li>✓ Confirma citas con fecha, hora y servicio</li>
                  <li>✓ Permite cancelar citas existentes</li>
                  <li>✓ Sincroniza automaticamente com o Google Calendar</li>
                </ul>
              </div>

              <Button onClick={saveAgentConfig} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salvar Configurações del Agente
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-6">
          {/* WhatsApp */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                WhatsApp (Evolution API)
              </CardTitle>
              <CardDescription>
                Conecte seu número do WhatsApp para receber mensagens
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground mb-4">
                <p>Las credenciales de Evolution API están configuradas globalmente por el administrador del sistema.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="instanceName">Nome de la instancia</Label>
                <Input
                  id="instanceName"
                  value={instanceName}
                  onChange={(e) => setInstanceName(e.target.value)}
                  placeholder="mi-negocio"
                />
                <p className="text-xs text-muted-foreground">
                  Nome único para identificar tu instancia de WhatsApp
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={saveWhatsAppConfig} variant="outline" disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar
                </Button>
                <Button onClick={connectWhatsApp} disabled={connectingWhatsApp}>
                  {connectingWhatsApp ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <QrCode className="mr-2 h-4 w-4" />
                  )}
                  Conectar WhatsApp
                </Button>
              </div>

              {qrCode && (
                <div className="p-4 border rounded-lg text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Escaneie este código QR com o WhatsApp
                  </p>
                  <img
                    src={`data:image/png;base64,${qrCode}`}
                    alt="QR Code"
                    className="mx-auto max-w-[250px]"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={connectWhatsApp}
                    className="mt-4"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Actualizar QR
                  </Button>
                </div>
              )}

              {whatsappInstance?.status === "connected" && (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-sm text-green-600 flex items-center gap-2">
                    <span className="status-dot connected" />
                    WhatsApp conectado
                    {whatsappInstance.phone_number && `: ${whatsappInstance.phone_number}`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Google Calendar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Google Calendar
              </CardTitle>
              <CardDescription>
                Sincroniza las citas automáticamente con tu calendario
              </CardDescription>
            </CardHeader>
            <CardContent>
              {calendarConnected ? (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-sm text-green-600 flex items-center gap-2">
                    <span className="status-dot connected" />
                    Google Calendar conectado
                  </p>
                </div>
              ) : (
                <Button onClick={connectGoogleCalendar}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Conectar Google Calendar
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
