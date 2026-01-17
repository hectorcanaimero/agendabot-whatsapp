# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AgendaBot is a WhatsApp-based scheduling SaaS that automates customer service and appointment booking through WhatsApp, with Google Calendar integration and DeepSeek AI agent.

**Stack**: Next.js 15 (App Router), React 19, TypeScript, Supabase (PostgreSQL + Auth), DeepSeek API, Evolution API (WhatsApp), Google Calendar API, Tailwind CSS, shadcn/ui

## Development Commands

```bash
# Development
pnpm dev              # Start development server at http://localhost:3000
pnpm build            # Build for production
pnpm start            # Start production server
pnpm lint             # Run linter

# Package Manager
# This project uses pnpm (note: package.json has this as project name, actual manager is pnpm)
```

## Environment Configuration

Required environment variables (see README for details):
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role (server-only)
- `DEEPSEEK_API_KEY` - DeepSeek API key
- `DEEPSEEK_API_URL` - Default: https://api.deepseek.com
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` - Google OAuth
- `NEXT_PUBLIC_APP_URL` - Application URL

## Architecture

### Core Flow (Message Processing Pipeline)

1. **WhatsApp Message** → Evolution API webhook → `/api/webhook/evolution/route.ts`
2. **Webhook handler** retrieves business config, working hours, services, existing appointments
3. **AI Agent** (`src/lib/deepseek/client.ts`) generates response with appointment context
4. **Appointment parsing** extracts structured data from AI response (`[APPOINTMENT_DATA]...[/APPOINTMENT_DATA]`)
5. **Database + Calendar sync** creates appointment in Supabase and Google Calendar
6. **Response delivery** via Evolution API back to WhatsApp

### Database Architecture (Multi-tenant)

The system is designed with strict tenant isolation. All business data is scoped by `business_id`:
- `profiles` → `businesses` (one user can have multiple businesses)
- `businesses` → working_hours, whatsapp_instances, google_calendar_connections, agent_configs, conversations, appointments
- Row Level Security (RLS) enforces user can only access their own business data
- Database trigger automatically creates profile on user signup

### Authentication & Authorization

- **Auth**: Supabase Auth (email/password)
- **Middleware** (`src/middleware.ts`): Protects dashboard routes, redirects logic
  - Protected: `/dashboard`, `/settings`, `/conversations`, `/appointments`, `/calendar`
  - Auth paths: `/login`, `/register` (redirects to dashboard if logged in)
  - Excluded: `/api/webhook/*` and static files
- **Client types**:
  - `createClient()` - Browser-side auth-aware client
  - `createServiceClient()` - Server-side service role (bypasses RLS, use carefully)
  - Server Components use cookie-based auth via `@supabase/ssr`

### External Service Clients

**Evolution API** (`src/lib/evolution/client.ts`):
- Manages WhatsApp connections via Evolution API
- Methods: createInstance, getQRCode, sendText, setWebhook
- Initialized per-instance with apiUrl, apiKey, instanceName

**DeepSeek AI** (`src/lib/deepseek/client.ts`):
- Generates conversational AI responses for appointment scheduling
- `generateSystemPrompt()`: Constructs dynamic prompt with business context, services, available slots
- `parseAppointmentData()`: Extracts JSON from `[APPOINTMENT_DATA]` tags
- `generateAvailableSlots()`: Calculates open slots from working hours minus existing appointments
- Agent is instructed to maintain core scheduling functions even with custom prompts

**Google Calendar** (`src/lib/google/calendar.ts`):
- OAuth2 flow for calendar access (offline access with refresh tokens)
- Functions: createCalendarEvent, deleteCalendarEvent, getCalendarEvents
- Timezone: America/Sao_Paulo (hardcoded in event creation)

### TypeScript Path Alias

- `@/*` maps to `src/*` (configured in tsconfig.json)

### Key Business Logic

**Appointment Slot Generation**:
- Scans 7 days ahead by default
- Filters by active working hours for each day of week
- Excludes past times and conflicting appointments
- Returns max 10 available slots

**AI Response Format**:
The AI agent embeds structured data in responses:
- `[APPOINTMENT_DATA]{"action":"schedule","date":"YYYY-MM-DD","time":"HH:mm","service":"...","client_name":"..."}[/APPOINTMENT_DATA]`
- Actions: schedule, cancel, check_availability
- This data is parsed server-side and stripped from user-facing response

**Custom Prompts**:
Businesses can add custom instructions to the AI agent, but the system ensures core scheduling functionality is preserved by appending custom prompt to base prompt.

## Database Schema Notes

- **Day of week**: 0 = Sunday, 6 = Saturday (in working_hours table)
- **Appointment duration**: Stored in minutes (default 30) at business level, overridable per service
- **Time formats**: HH:mm for working hours, ISO 8601 for appointments
- **Services**: Stored as JSONB in agent_configs.services
- **Conversation status**: active, closed, pending
- **Message direction**: inbound (from customer), outbound (from agent)
- **Appointment status**: scheduled, confirmed, cancelled, completed

## Important Patterns

1. **Webhook security**: The Evolution webhook endpoint (`/api/webhook/evolution`) is excluded from middleware auth but should validate requests (currently doesn't - potential security concern)

2. **Service role usage**: `createServiceClient()` bypasses RLS. Only use for:
   - Webhook handlers (no auth context)
   - Cross-tenant operations requiring elevated access
   - API routes that need to verify user ownership then access other users' data

3. **Error handling in calendar sync**: Calendar operations are wrapped in try-catch to prevent webhook failures if Google API is down

4. **Conversation continuity**: Messages are limited to last 20 in history for AI context to manage token usage

5. **TypeScript strictness**: Project uses strict mode, prefer explicit types over `any`

6. **Evolution API communication**: Never call Evolution API directly from the frontend. Always use backend API routes (`/api/whatsapp/*`) to avoid CORS issues and expose credentials. The backend routes handle:
   - Instance creation and status checks
   - QR code generation
   - Webhook configuration
   - Authentication verification

## Common Development Tasks

**Adding a new API integration**:
- Create client in `src/lib/{service}/client.ts`
- Add environment variables
- Add credentials table to schema if persistent storage needed
- Follow pattern of EvolutionClient or GoogleCalendar client classes

**Modifying AI behavior**:
- Edit `generateSystemPrompt()` in `src/lib/deepseek/client.ts`
- Maintain `[APPOINTMENT_DATA]` format for structured responses
- Test appointment parsing logic after prompt changes

**Database schema changes**:
- Update `supabase/schema.sql`
- Add corresponding TypeScript types in `src/types/index.ts`
- Run schema updates in Supabase SQL editor (no migration system currently)
- Update RLS policies if adding new tables

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Login/register pages (route group)
│   ├── (dashboard)/         # Protected dashboard pages (route group)
│   ├── api/
│   │   ├── auth/google/     # Google OAuth callback
│   │   └── webhook/evolution/  # WhatsApp webhook handler
│   └── page.tsx             # Landing page
├── components/
│   ├── ui/                  # shadcn/ui components
│   └── dashboard/           # Dashboard-specific components
├── lib/
│   ├── supabase/           # Supabase client factories
│   ├── evolution/          # Evolution API client
│   ├── deepseek/           # DeepSeek AI client
│   ├── google/             # Google Calendar client
│   └── utils.ts            # Shared utilities (cn helper, etc)
└── types/
    └── index.ts            # Centralized TypeScript types
```

## Notes

- Project is in Spanish/Portuguese for user-facing content (AI responses, calendar descriptions)
- No testing framework currently configured
- No CI/CD pipeline defined
- Middleware environment key uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` but this should likely be `NEXT_PUBLIC_SUPABASE_ANON_KEY` (inconsistency)
