import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, User, Clock } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";

export default async function ConversationsPage() {
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

  // Get conversations with last message
  const { data: conversations } = await supabase
    .from("conversations")
    .select(`
      *,
      messages (
        content,
        direction,
        created_at
      )
    `)
    .eq("business_id", business.id)
    .order("last_message_at", { ascending: false });

  // Process conversations to get last message
  const processedConversations = conversations?.map((conv) => {
    const messages = conv.messages || [];
    const lastMessage = messages.sort(
      (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
    return {
      ...conv,
      lastMessage,
    };
  });

  return (
    <div className="space-y-6 animate-fade-in pb-20 lg:pb-6">
      <div>
        <h1 className="text-2xl font-bold">Conversaciones</h1>
        <p className="text-muted-foreground">
          Historial de conversaciones con clientes
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Conversations list */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Contactos</CardTitle>
            <CardDescription>
              {processedConversations?.length || 0} conversaciones
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              {processedConversations && processedConversations.length > 0 ? (
                <div className="divide-y">
                  {processedConversations.map((conv) => (
                    <Link
                      key={conv.id}
                      href={`/conversations/${conv.id}`}
                      className="flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-green-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium truncate">
                            {conv.contact_name || conv.contact_phone}
                          </p>
                          <Badge
                            variant={conv.status === "active" ? "default" : "secondary"}
                            className="shrink-0"
                          >
                            {conv.status === "active" ? "Activa" : "Cerrada"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {conv.contact_phone}
                        </p>
                        {conv.lastMessage && (
                          <p className="text-sm text-muted-foreground truncate mt-1">
                            {conv.lastMessage.direction === "outbound" && "Tú: "}
                            {conv.lastMessage.content}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(conv.last_message_at), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay conversaciones aún</p>
                  <p className="text-sm mt-1">
                    Las conversaciones aparecerán cuando los clientes te escriban por WhatsApp
                  </p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Placeholder for conversation detail */}
        <Card className="lg:col-span-2">
          <CardContent className="flex items-center justify-center h-[650px] text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Selecciona una conversación</p>
              <p className="text-sm">
                Haz clic en un contacto para ver el historial de mensajes
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
