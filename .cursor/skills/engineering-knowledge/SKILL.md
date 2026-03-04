---
name: engineering-knowledge
description: Engineering and architecture reference for the TouchScreen product. Use when working on any part of the codebase, making architectural decisions, understanding system boundaries, or when the user asks about how the product works technically.
---

# TouchScreen Engineering Knowledge

## Product Summary

TouchScreen is a home automation touch-screen product. Users design and control a Home Assistant dashboard on a Raspberry Pi (720x720px display) using natural language via a mobile companion app. An AI agent (Claude) edits dashboard code on the Pi, with Vite HMR updating the display in real time.

## System Boundary Map

```
CLOUD (Vercel)                    LOCAL NETWORK
┌──────────────┐         ┌────────────┐      ┌──────────────┐
│  Next.js App │ HTTPS   │ Mobile App │ HTTP │ Raspberry Pi │
│  (app/)      │◄───────►│ (Expo)     │◄────►│ device-agent │
│  AI, Auth,   │         │ mobile-new/│  +WS │ Fastify :3001│
│  Credits, DB │         └────────────┘      │              │
└──────────────┘                             │ Vite :5173   │
                                             │ Dashboard    │
                                             │ sandbox-     │
                                             │ template/    │
                                             │      │       │
                                             │      ▼       │
                                             │ Home         │
                                             │ Assistant WS │
                                             └──────────────┘
```

## The Four Packages

| Package | Path | Runtime | Framework | Purpose |
|---------|------|---------|-----------|---------|
| Cloud app | `app/` | Node 24 / Vercel | Next.js 16 (App Router) | Auth, AI chat, credits, Stripe, device registration |
| Mobile app | `mobile-new/` | React Native | Expo 54, expo-router | Companion app for editing dashboard via AI |
| Dashboard | `sandbox-template/` | Browser | Vite 6, React 19 | Touch-screen UI showing HA entities |
| Device server | `device-agent/` | Node (ESM) | Fastify 5 | Pi-local server: file ops, HA proxy, Vite lifecycle |

## Core Data Flow (AI Editing)

1. User sends prompt in mobile app
2. Mobile app → `POST /api/chat` (cloud) with auth + device context
3. Cloud streams tool calls (`readFile`, `writeFile`, etc.) back to mobile
4. Mobile executes tools against Pi via `DeviceClient` HTTP calls
5. Pi writes files to `sandbox-template/` → Vite HMR updates the display
6. HA entity catalog at `src/lib/ha-catalog.json` provides entity discovery for AI

## Key Technology Choices

| Concern | Choice |
|---------|--------|
| AI | Vercel AI SDK, @ai-sdk/gateway, Claude Sonnet 4 |
| Auth | Better Auth (magic link, Apple, Google) |
| DB | Neon PostgreSQL + Drizzle ORM |
| Payments | Stripe (checkout + webhooks) |
| Email | Resend |
| Device discovery | mDNS via Avahi (`_touchscreen._tcp`) + react-native-zeroconf |
| Dashboard styling | Tailwind CSS v3, dark theme, device-specific tokens |
| Cloud styling | Tailwind CSS v4 |
| Mobile styling | React Native StyleSheet + custom color constants |
| Icons | lucide-react (dashboard) |

## Dashboard Architecture

- **Entry**: `Dashboard.tsx` is the main layout file — this is what AI edits
- **Components**: Domain cards (`LightCard`, `ClimateCard`, `MediaCard`, etc.) with `entityId` prop
- **Data hook**: `useEntity(entityId)` returns live HA state; works with mock or live data
- **Provider**: `HAProvider` context wraps the app; uses WebSocket on device, mock data otherwise
- **Protected files** (AI must not edit): `ha-provider`, `ha-types`, `ha-connection`, `mock-data`, `App.tsx`, `main.tsx`
- **Display**: 720x720px, dark theme (`#0d0d1a` bg, `#c9a962` accent)
- **Tailwind tokens**: `w-screen-device`, `h-screen-device`, `touch-min`, `device-xs`…`device-hero`

## Device Agent API

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/status` | GET | Device code, HA status, edit mode |
| `/api/files` | GET | List sandbox project files |
| `/api/files/*` | GET/PUT | Read/write individual files |
| `/api/ha/entities` | GET | HA entity snapshot |
| `/api/ha/catalog` | GET | Compact catalog for LLM |
| `/api/ha/service` | POST | Call HA service |
| `/api/dev/start` | POST | Start Vite dev server |
| `/api/dev/stop` | POST | Stop Vite dev server |
| `/api/dev/errors` | GET | Vite stderr for AI debugging |
| `/api/build` | POST | npm install + vite build |
| `/api/packages/install` | POST | Install npm package |
| `/ws` | WS | Real-time HA entity stream |

## Cloud App API

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/chat` | POST | AI chat (auth + credits, tools streamed) |
| `/api/demo/chat` | POST | Marketing demo (Vercel Sandbox execution) |
| `/api/auth/*` | * | Better Auth endpoints |
| `/api/devices` | GET/POST | List/register devices |
| `/api/devices/[code]` | GET | Device details |
| `/api/credits` | GET | Credit balance |
| `/api/checkout` | POST | Stripe checkout |
| `/api/webhooks/stripe` | POST | Stripe webhooks |

## Development Setup

`npm run dev` at root launches the Ink TUI orchestrator which:

1. Runs preflight (SSH to Pi, vercel CLI, HA connectivity)
2. Detects LAN IP and Pi IP
3. Rsyncs `device-agent/` and `sandbox-template/` to Pi
4. Starts: Pi agent (SSH), Vercel dev, Expo, file watchers
5. Starts Vite on Pi via `/api/dev/start`
6. Watches source dirs and auto-rsyncs changes

**TUI hotkeys**: 1-5 (tabs: API/Expo/Pi Agent/Vite/Sync), R (restart Pi), O (open Vite), X (shutdown Pi), Q (quit)

**Per-app dev**:
- `app/`: `vercel dev` or `next dev`
- `mobile-new/`: `expo start`
- `sandbox-template/`: `vite --host 0.0.0.0`
- `device-agent/`: `node --watch src/index.js`

## Deployment

**Cloud**: Pushed to Vercel via Git.

**Pi**: `./deploy.sh [user@host] [--skip-install] [--restart]`
- Rsyncs `device-agent/` → `/opt/touchscreen/server`
- Rsyncs `sandbox-template/` → `/opt/touchscreen/dashboard`
- Systemd service: `touchscreen-server.service`
- Config: `/opt/touchscreen/config.json`

## File Conventions

- **Components**: PascalCase (`LightCard.tsx`)
- **Routes/libs**: kebab-case (`ha-connection.ts`)
- **Next.js**: `page.tsx`, `layout.tsx`, `route.ts` in `src/app/`
- **Expo**: `app/` with `(group)` route groups
- **Dashboard exports**: `export default` for components
- **Path alias**: `@/*` → `./src/*` in cloud app

## Environment Variables

**Cloud (Vercel)**: `DATABASE_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GOOGLE_CLIENT_*`, `APPLE_CLIENT_*`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`

**Device**: `DEVICE_CONFIG` → path to `config.json` (deviceCode, dashboardDir, haUrl, haToken)

**Mobile**: `EXPO_PUBLIC_API_URL`

**Dashboard (Vite)**: `VITE_HA_URL`, `VITE_HA_TOKEN`

## Additional Reference

For detailed architecture diagrams, component inventories, and service internals, see [architecture.md](architecture.md).

For instructions on updating this skill, see [UPDATE-INSTRUCTIONS.md](UPDATE-INSTRUCTIONS.md).
