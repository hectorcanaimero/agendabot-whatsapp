# AgendaBot - Sistema SaaS de Agendamiento vía WhatsApp

Sistema completo para automatizar la atención al cliente y agendamiento de citas a través de WhatsApp, con integración a Google Calendar y agente de IA con DeepSeek.

## Características

- **Agente de IA con DeepSeek**: Responde automáticamente a los clientes y gestiona el agendamiento de citas
- **Integración con WhatsApp**: Conecta tu número de WhatsApp Business a través de Evolution API
- **Sincronización con Google Calendar**: Las citas se crean automáticamente en tu calendario
- **Horarios personalizables**: Define días, horarios de atención y duración de citas
- **Prompt personalizable**: Ajusta el comportamiento del agente sin perder la funcionalidad de agendamiento
- **Dashboard completo**: Visualiza conversaciones, citas y estadísticas
- **Multi-tenant**: Cada usuario tiene su propio negocio, configuración y datos

## Stack Tecnológico

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Supabase
- **Base de datos**: PostgreSQL (Supabase)
- **Autenticación**: Supabase Auth
- **IA**: DeepSeek API
- **WhatsApp**: Evolution API
- **Calendario**: Google Calendar API

## Requisitos Previos

1. Cuenta en [Supabase](https://supabase.com)
2. API Key de [DeepSeek](https://deepseek.com)
3. Instancia de [Evolution API](https://github.com/EvolutionAPI/evolution-api)
4. Proyecto en [Google Cloud Console](https://console.cloud.google.com) con Calendar API habilitada

## Instalación

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd whatsapp-scheduler
```

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Configurar variables de entorno

Copia el archivo `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

Completa las variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# DeepSeek API
DEEPSEEK_API_KEY=tu_deepseek_api_key
DEEPSEEK_API_URL=https://api.deepseek.com

# Google OAuth
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Configurar Supabase

1. Crea un nuevo proyecto en Supabase
2. Ve a SQL Editor y ejecuta el contenido de `supabase/schema.sql`
3. Copia las credenciales del proyecto a tu `.env.local`

### 5. Configurar Google OAuth

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la API de Google Calendar
4. Configura la pantalla de consentimiento OAuth
5. Crea credenciales OAuth 2.0 (Aplicación web)
6. Añade `http://localhost:3000/api/auth/google/callback` como URI de redirección autorizada
7. Copia el Client ID y Client Secret a tu `.env.local`

### 6. Iniciar el servidor de desarrollo

```bash
pnpm dev
```

La aplicación estará disponible en `http://localhost:3000`

## Configuración de Evolution API

### Webhook

Configura el webhook de tu instancia de Evolution API para apuntar a:

```
https://tu-dominio.com/api/webhook/evolution
```

Eventos a habilitar:
- MESSAGES_UPSERT
- MESSAGES_UPDATE
- CONNECTION_UPDATE
- QRCODE_UPDATED

## Uso

### 1. Registro e inicio de sesión

1. Accede a `/register` para crear una cuenta
2. Confirma tu email (si está habilitado en Supabase)
3. Inicia sesión en `/login`

### 2. Configuración inicial

1. **Negocio**: Define el nombre y duración base de citas
2. **Horarios**: Configura los días y horarios de atención
3. **WhatsApp**: Conecta tu número escaneando el QR
4. **Google Calendar**: Autoriza el acceso a tu calendario
5. **Agente**: Añade servicios y personaliza el prompt

### 3. Personalización del Agente

El agente tiene un comportamiento base que incluye:
- Saludar y presentar servicios
- Mostrar horarios disponibles
- Confirmar citas
- Cancelar citas
- Sincronizar con Google Calendar

Puedes añadir instrucciones adicionales en el campo "Instrucciones adicionales" sin perder estas funcionalidades base.

## Estructura del Proyecto

```
whatsapp-scheduler/
├── src/
│   ├── app/
│   │   ├── (auth)/          # Páginas de autenticación
│   │   ├── (dashboard)/     # Dashboard y páginas protegidas
│   │   ├── api/             # API Routes
│   │   └── page.tsx         # Landing page
│   ├── components/
│   │   ├── ui/              # Componentes shadcn/ui
│   │   └── dashboard/       # Componentes del dashboard
│   ├── lib/
│   │   ├── supabase/        # Clientes de Supabase
│   │   ├── evolution/       # Cliente de Evolution API
│   │   ├── deepseek/        # Cliente de DeepSeek
│   │   └── google/          # Cliente de Google Calendar
│   └── types/               # Tipos TypeScript
├── supabase/
│   └── schema.sql           # Esquema de base de datos
└── public/                  # Archivos estáticos
```

## Licencia

MIT
