import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Calendar,
  Bot,
  Zap,
  Shield,
  Clock,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold">AgendaBot</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Começar grátis</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-sm mb-6">
            <Zap className="w-4 h-4" />
            Automatize seu atendimento ao cliente
          </div>
          <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6 max-w-4xl mx-auto">
            Agente de WhatsApp para{" "}
            <span className="text-primary">agendamento automático</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Deixe a IA atender seus clientes 24/7, agendar consultas e sincronizar
            tudo com seu Google Calendar. Sem intervenção manual.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/register">
                Começar grátis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Ver demo</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">
              Tudo que você precisa para automatizar sua agenda
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Uma solução completa que integra WhatsApp, IA e Google Calendar
              para gerenciar seus agendamentos sem esforço.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-card p-6 rounded-xl border">
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Integração com WhatsApp
              </h3>
              <p className="text-muted-foreground">
                Conecte seu número do WhatsApp Business e atenda seus clientes
                automaticamente através da Evolution API.
              </p>
            </div>

            <div className="bg-card p-6 rounded-xl border">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
                <Bot className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Agente com IA (DeepSeek)
              </h3>
              <p className="text-muted-foreground">
                Um agente inteligente que entende as necessidades dos seus
                clientes e gerencia o agendamento de forma natural.
              </p>
            </div>

            <div className="bg-card p-6 rounded-xl border">
              <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Sincronização com Google Calendar
              </h3>
              <p className="text-muted-foreground">
                As consultas são criadas automaticamente no seu calendário do Google,
                evitando conflitos e agendamento duplo.
              </p>
            </div>

            <div className="bg-card p-6 rounded-xl border">
              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-purple-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Horários personalizáveis
              </h3>
              <p className="text-muted-foreground">
                Defina seus dias e horários de atendimento, duração das consultas e
                serviços disponíveis.
              </p>
            </div>

            <div className="bg-card p-6 rounded-xl border">
              <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-orange-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Prompt personalizável
              </h3>
              <p className="text-muted-foreground">
                Personalize como seu agente responde sem perder a funcionalidade
                de agendamento. Adicione seu toque pessoal.
              </p>
            </div>

            <div className="bg-card p-6 rounded-xl border">
              <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-cyan-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Dashboard completo
              </h3>
              <p className="text-muted-foreground">
                Visualize conversas, agendamentos e estatísticas em um painel
                moderno e fácil de usar.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Como funciona</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Em apenas 4 passos você terá seu agente de WhatsApp funcionando
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-8">
            {[
              {
                step: 1,
                title: "Configure seu negócio",
                description:
                  "Defina o nome do seu negócio, horários de atendimento e duração das consultas.",
              },
              {
                step: 2,
                title: "Conecte o WhatsApp",
                description:
                  "Vincule seu número do WhatsApp escaneando um código QR com a Evolution API.",
              },
              {
                step: 3,
                title: "Conecte o Google Calendar",
                description:
                  "Autorize o acesso ao seu calendário para sincronizar os agendamentos automaticamente.",
              },
              {
                step: 4,
                title: "Personalize seu agente",
                description:
                  "Adicione serviços, ajuste o prompt e deixe o agente atender seus clientes.",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-6 items-start">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Comece a automatizar sua agenda hoje
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Junte-se aos negócios que já estão economizando tempo e melhorando a
            experiência dos seus clientes.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/register">
              Criar conta grátis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">AgendaBot</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 AgendaBot. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
