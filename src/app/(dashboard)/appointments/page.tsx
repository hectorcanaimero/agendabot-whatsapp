import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Clock,
  User,
  Phone,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig = {
  scheduled: {
    label: "Agendado",
    variant: "default" as const,
    icon: Clock,
  },
  confirmed: {
    label: "Confirmado",
    variant: "default" as const,
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelado",
    variant: "destructive" as const,
    icon: XCircle,
  },
  completed: {
    label: "Concluído",
    variant: "secondary" as const,
    icon: CheckCircle2,
  },
};

export default async function AppointmentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!business) {
    redirect("/dashboard");
  }

  // Get upcoming appointments
  const { data: upcomingAppointments } = await supabase
    .from("appointments")
    .select("*")
    .eq("business_id", business.id)
    .in("status", ["scheduled", "confirmed"])
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true });

  // Get past appointments
  const { data: pastAppointments } = await supabase
    .from("appointments")
    .select("*")
    .eq("business_id", business.id)
    .or(`status.eq.completed,status.eq.cancelled,start_time.lt.${new Date().toISOString()}`)
    .order("start_time", { ascending: false })
    .limit(50);

  // Get today's appointments
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: todayAppointments } = await supabase
    .from("appointments")
    .select("*")
    .eq("business_id", business.id)
    .gte("start_time", today.toISOString())
    .lt("start_time", tomorrow.toISOString())
    .order("start_time", { ascending: true});

  const AppointmentCard = ({ appointment }: { appointment: any }) => {
    const status = statusConfig[appointment.status as keyof typeof statusConfig];
    const StatusIcon = status.icon;

    return (
      <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-medium">
              {appointment.contact_name || "Cliente"}
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-3 w-3" />
              {appointment.contact_phone}
            </div>
            {appointment.service_name && (
              <p className="text-sm text-muted-foreground">
                {appointment.service_name}
              </p>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-2 justify-end mb-1">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {format(new Date(appointment.start_time), "d MMM yyyy", { locale: ptBR })}
            </span>
          </div>
          <div className="flex items-center gap-2 justify-end mb-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {format(new Date(appointment.start_time), "HH:mm")} -{" "}
              {format(new Date(appointment.end_time), "HH:mm")}
            </span>
          </div>
          <Badge variant={status.variant} className="gap-1">
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </Badge>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 lg:pb-6">
      <div>
        <h1 className="text-2xl font-bold">Agendamentos</h1>
        <p className="text-muted-foreground">
          Gerencie todos os agendamentos do seu negócio
        </p>
      </div>

      {/* Today's summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Agendamentos Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {todayAppointments?.length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Próximos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {upcomingAppointments?.length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Concluídos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pastAppointments?.filter((a) => a.status === "completed").length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList>
          <TabsTrigger value="today">Hoje</TabsTrigger>
          <TabsTrigger value="upcoming">Próximos</TabsTrigger>
          <TabsTrigger value="past">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="today">
          <Card>
            <CardHeader>
              <CardTitle>Agendamentos de Hoje</CardTitle>
              <CardDescription>
                {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {todayAppointments && todayAppointments.length > 0 ? (
                <div className="space-y-3">
                  {todayAppointments.map((apt) => (
                    <AppointmentCard key={apt.id} appointment={apt} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Não há agendamentos para hoje</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upcoming">
          <Card>
            <CardHeader>
              <CardTitle>Próximos Agendamentos</CardTitle>
              <CardDescription>
                Agendamentos programados e confirmados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingAppointments && upcomingAppointments.length > 0 ? (
                <div className="space-y-3">
                  {upcomingAppointments.map((apt) => (
                    <AppointmentCard key={apt.id} appointment={apt} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Não há agendamentos próximos</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="past">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Agendamentos</CardTitle>
              <CardDescription>
                Agendamentos concluídos e cancelados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pastAppointments && pastAppointments.length > 0 ? (
                <div className="space-y-3">
                  {pastAppointments.map((apt) => (
                    <AppointmentCard key={apt.id} appointment={apt} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Não há histórico de agendamentos</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
