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
              <Link href="/login">Iniciar sesión</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Comenzar gratis</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-sm mb-6">
            <Zap className="w-4 h-4" />
            Automatiza tu atención al cliente
          </div>
          <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6 max-w-4xl mx-auto">
            Agente de WhatsApp para{" "}
            <span className="text-primary">agendamiento automático</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Deja que la IA atienda a tus clientes 24/7, agende citas y sincronice
            todo con tu Google Calendar. Sin intervención manual.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/register">
                Comenzar gratis
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
              Todo lo que necesitas para automatizar tu agenda
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Una solución completa que integra WhatsApp, IA y Google Calendar
              para gestionar tus citas sin esfuerzo.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-card p-6 rounded-xl border">
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Integración con WhatsApp
              </h3>
              <p className="text-muted-foreground">
                Conecta tu número de WhatsApp Business y atiende a tus clientes
                automáticamente a través de Evolution API.
              </p>
            </div>

            <div className="bg-card p-6 rounded-xl border">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
                <Bot className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Agente con IA (DeepSeek)
              </h3>
              <p className="text-muted-foreground">
                Un agente inteligente que entiende las necesidades de tus
                clientes y gestiona el agendamiento de forma natural.
              </p>
            </div>

            <div className="bg-card p-6 rounded-xl border">
              <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Sincronización con Google Calendar
              </h3>
              <p className="text-muted-foreground">
                Las citas se crean automáticamente en tu calendario de Google,
                evitando conflictos y doble agendamiento.
              </p>
            </div>

            <div className="bg-card p-6 rounded-xl border">
              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-purple-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Horarios personalizables
              </h3>
              <p className="text-muted-foreground">
                Define tus días y horarios de atención, duración de citas y
                servicios disponibles.
              </p>
            </div>

            <div className="bg-card p-6 rounded-xl border">
              <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-orange-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Prompt personalizable
              </h3>
              <p className="text-muted-foreground">
                Personaliza cómo responde tu agente sin perder la funcionalidad
                de agendamiento. Añade tu toque personal.
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
                Visualiza conversaciones, citas y estadísticas en un panel
                moderno y fácil de usar.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Cómo funciona</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              En solo 4 pasos tendrás tu agente de WhatsApp funcionando
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-8">
            {[
              {
                step: 1,
                title: "Configura tu negocio",
                description:
                  "Define el nombre de tu negocio, horarios de atención y duración de las citas.",
              },
              {
                step: 2,
                title: "Conecta WhatsApp",
                description:
                  "Vincula tu número de WhatsApp escaneando un código QR con Evolution API.",
              },
              {
                step: 3,
                title: "Conecta Google Calendar",
                description:
                  "Autoriza el acceso a tu calendario para sincronizar las citas automáticamente.",
              },
              {
                step: 4,
                title: "Personaliza tu agente",
                description:
                  "Añade servicios, ajusta el prompt y deja que el agente atienda a tus clientes.",
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
            Comienza a automatizar tu agenda hoy
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Únete a los negocios que ya están ahorrando tiempo y mejorando la
            experiencia de sus clientes.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/register">
              Crear cuenta gratis
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
              © 2025 AgendaBot. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
