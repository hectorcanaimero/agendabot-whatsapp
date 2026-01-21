import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  MessageSquare,
  Calendar,
  Users,
  TrendingUp,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user's business
  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // If no business, show setup wizard
  if (!business) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Bem-vindo ao AgendaBot!</h1>
          <p className="text-muted-foreground">
            Configure seu negócio para começar a receber agendamentos automaticamente
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configuração inicial</CardTitle>
            <CardDescription>
              Complete estes passos para ativar seu agente de WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-4 border rounded-lg">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Configure seu negócio</h3>
                <p className="text-sm text-muted-foreground">
                  Nome, horários de atendimento e duração das consultas
                </p>
              </div>
              <Button asChild>
                <Link href="/settings">
                  Configurar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="flex items-center gap-4 p-4 border rounded-lg opacity-50">
              <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Conecte o WhatsApp</h3>
                <p className="text-sm text-muted-foreground">
                  Vincule seu número com a Evolution API
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 border rounded-lg opacity-50">
              <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Conecte o Google Calendar</h3>
                <p className="text-sm text-muted-foreground">
                  Sincronize seus agendamentos automaticamente
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 border rounded-lg opacity-50">
              <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
                4
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Personalize seu agente</h3>
                <p className="text-sm text-muted-foreground">
                  Configure o prompt e serviços
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count: totalConversations } = await supabase
    .from("conversations")
    .select("*", { count: "exact", head: true })
    .eq("business_id", business.id);

  const { count: todayAppointments } = await supabase
    .from("appointments")
    .select("*", { count: "exact", head: true })
    .eq("business_id", business.id)
    .gte("start_time", today.toISOString())
    .lt("start_time", new Date(today.getTime() + 86400000).toISOString());

  const { count: totalAppointments } = await supabase
    .from("appointments")
    .select("*", { count: "exact", head: true })
    .eq("business_id", business.id)
    .in("status", ["scheduled", "confirmed"]);

  // Get recent appointments
  const { data: recentAppointments } = await supabase
    .from("appointments")
    .select("*")
    .eq("business_id", business.id)
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true })
    .limit(5);

  // Get recent conversations
  const { data: recentConversations } = await supabase
    .from("conversations")
    .select("*")
    .eq("business_id", business.id)
    .order("last_message_at", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Painel</h1>
        <p className="text-muted-foreground">
          Resumo do seu negócio: {business.name}
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Conversas
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalConversations || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total de conversas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Agendamentos Hoje
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayAppointments || 0}</div>
            <p className="text-xs text-muted-foreground">
              Agendamentos para hoje
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Agendamentos Pendentes
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAppointments || 0}</div>
            <p className="text-xs text-muted-foreground">
              Agendamentos a atender
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Duração Consulta
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{business.appointment_duration} min</div>
            <p className="text-xs text-muted-foreground">
              Tempo por consulta
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming appointments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Próximos Agendamentos</CardTitle>
              <CardDescription>Agendamentos programados</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/appointments">
                Ver todos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentAppointments && recentAppointments.length > 0 ? (
              <div className="space-y-4">
                {recentAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{apt.contact_name || apt.contact_phone}</p>
                        <p className="text-sm text-muted-foreground">
                          {apt.service_name || "Consulta"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {format(new Date(apt.start_time), "HH:mm")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(apt.start_time), "d MMM", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Não há agendamentos próximos</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent conversations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Conversas Recentes</CardTitle>
              <CardDescription>Últimas interações</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/conversations">
                Ver todas
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentConversations && recentConversations.length > 0 ? (
              <div className="space-y-4">
                {recentConversations.map((conv) => (
                  <div
                    key={conv.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                        <MessageSquare className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <p className="font-medium">{conv.contact_name || conv.contact_phone}</p>
                        <p className="text-sm text-muted-foreground">
                          {conv.contact_phone}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                          conv.status === "active"
                            ? "bg-green-500/10 text-green-500"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {conv.status === "active" ? "Ativa" : "Fechada"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Não há conversas ainda</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
