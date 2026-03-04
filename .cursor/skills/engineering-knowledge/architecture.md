# TouchScreen Detailed Architecture Reference

## 1. Cloud App (`app/`)

### Structure

```
app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (marketing)/        # Public pages
│   │   ├── app/                # Authenticated app shell
│   │   ├── checkout/           # Stripe checkout flow
│   │   ├── demo/               # Marketing demo with Vercel Sandbox
│   │   ├── register/           # Device registration
│   │   └── api/
│   │       ├── chat/route.ts       # AI chat endpoint
│   │       ├── demo/chat/route.ts  # Demo chat (sandbox execution)
│   │       ├── auth/[...all]/      # Better Auth catch-all
│   │       ├── devices/            # Device CRUD
│   │       ├── credits/            # Credit balance
│   │       ├── checkout/           # Stripe session creation
│   │       └── webhooks/stripe/    # Stripe webhook handler
│   ├── components/             # Shared React components
│   └── lib/
│       ├── auth.ts             # Better Auth config (magic link, Apple, Google, Expo)
│       ├── auth-client.ts      # Client-side auth hooks
│       ├── db/
│       │   ├── index.ts        # Drizzle client (Neon)
│       │   └── schema.ts       # DB schema (users, sessions, devices, credits)
│       ├── stripe.ts           # Stripe client + helpers
│       ├── system-prompt.ts    # AI system prompt builder
│       └── demo-sandbox.ts     # Vercel Sandbox config for demo
├── drizzle/                    # SQL migrations
├── drizzle.config.ts           # Drizzle Kit config
└── next.config.ts
```

### AI Chat Flow (`/api/chat`)

1. Authenticate user via Better Auth session
2. Deduct credits (1 per message)
3. Build system prompt with HA entity catalog + available components
4. Stream response via Vercel AI SDK with tool definitions
5. Tools are NOT executed server-side — tool calls stream to the mobile client
6. Mobile client executes tools against the Pi's device-agent

### AI Tools (defined in system prompt, executed client-side)

| Tool | Args | Behavior |
|------|------|----------|
| `readFile` | `path` | Read file from sandbox on Pi |
| `writeFile` | `path`, `content` | Write file to sandbox on Pi |
| `listFiles` | — | List sandbox project files |
| `installPackage` | `packageName` | npm install on Pi |
| `getDevServerErrors` | — | Read Vite stderr from Pi |

### Database Schema (Drizzle)

Key tables: `user`, `session`, `account`, `verification` (Better Auth), plus `device`, `credit_transaction`.

### Auth Middleware

Protected paths: `/app`, `/checkout`, `/order`, `/register`, `/demo`

---

## 2. Mobile App (`mobile-new/`)

### Structure

```
mobile-new/
├── app/
│   ├── _layout.tsx             # Root layout (auth provider)
│   ├── (auth)/
│   │   └── sign-in.tsx         # Sign-in screen
│   ├── (tabs)/
│   │   ├── _layout.tsx         # Tab navigator
│   │   ├── index.tsx           # Device list
│   │   ├── explore.tsx         # Explore/discover
│   │   └── settings.tsx        # User settings
│   ├── device/[id]/
│   │   ├── index.tsx           # Device overview
│   │   ├── edit.tsx            # AI chat editing screen
│   │   ├── settings.tsx        # Device settings
│   │   └── ha-entities.tsx     # HA entity browser
│   └── setup/
│       ├── index.tsx           # Setup entry
│       ├── connect.tsx         # Connect to Pi
│       └── home-assistant.tsx  # Configure HA
├── components/
│   ├── ChatMessage.tsx
│   ├── DeviceCard.tsx
│   ├── ToolCallRenderer.tsx    # Renders tool call results inline
│   └── ...
├── lib/
│   ├── device-client.ts        # HTTP client for Pi API
│   ├── auth.ts                 # Auth context + hooks
│   ├── discovery.ts            # mDNS device discovery
│   ├── api.ts                  # Cloud API client
│   └── constants.ts            # Colors, spacing, API URLs
└── constants/
    └── Colors.ts
```

### Device Discovery

1. mDNS scan for `_touchscreen._tcp` via react-native-zeroconf
2. Hostname fallback (`touchscreen.local`)
3. Known devices from cloud API

### Edit Screen Flow

1. Opens WebSocket to Pi for live entity updates
2. `useChat` hook connects to cloud `/api/chat`
3. Receives streamed tool calls from AI
4. Executes each tool via `DeviceClient` against Pi HTTP API
5. Results sent back as tool results for AI context

---

## 3. Dashboard (`sandbox-template/`)

### Structure

```
sandbox-template/
├── src/
│   ├── main.tsx                # React entry (DO NOT EDIT)
│   ├── App.tsx                 # Root with HAProvider (DO NOT EDIT)
│   ├── Dashboard.tsx           # Main layout — AI EDITS THIS
│   ├── components/
│   │   ├── LightCard.tsx
│   │   ├── ClimateCard.tsx
│   │   ├── MediaCard.tsx
│   │   ├── WeatherCard.tsx
│   │   ├── SensorCard.tsx
│   │   ├── SceneCard.tsx
│   │   ├── CameraCard.tsx
│   │   ├── CoverCard.tsx
│   │   └── ...
│   └── lib/
│       ├── ha-provider.tsx     # HAProvider context (DO NOT EDIT)
│       ├── ha-types.ts         # HA TypeScript types (DO NOT EDIT)
│       ├── ha-connection.ts    # WebSocket connection (DO NOT EDIT)
│       ├── ha-catalog.json     # Entity catalog (written by device-agent)
│       └── mock-data.ts        # Mock entities for dev (DO NOT EDIT)
├── index.html
├── vite.config.ts              # Port 5173, React plugin
├── tailwind.config.ts          # Device-specific theme
├── package.json
└── tsconfig*.json
```

### Component Pattern

Every dashboard card follows this pattern:

```tsx
import { useEntity } from '../lib/ha-provider';

export default function LightCard({ entityId }: { entityId: string }) {
  const entity = useEntity(entityId);
  if (!entity) return null;
  // Render card with entity.state, entity.attributes
}
```

### Tailwind Theme (Device-Specific)

```
Screen: 720x720px (84x84mm physical)
Colors: bg #0d0d1a, surface #1a1a2e, accent #c9a962
Spacing: touch-min (44px), touch (48px), card-px, card-py, card-gap
Font sizes: device-xs through device-hero
Utilities: w-screen-device, h-screen-device
```

### HA Entity Catalog (`ha-catalog.json`)

Written by device-agent's HA connection service. Structure:

```json
{
  "areas": [{ "area_id": "...", "name": "..." }],
  "entities": {
    "light": [{ "entity_id": "light.living_room", "name": "...", "area": "..." }],
    "climate": [...],
    "media_player": [...]
  },
  "componentMap": {
    "light": "LightCard",
    "climate": "ClimateCard"
  }
}
```

---

## 4. Device Agent (`device-agent/`)

### Structure

```
device-agent/
├── src/
│   ├── index.js                # Fastify server entry
│   ├── routes/
│   │   ├── status.js           # GET /api/status
│   │   ├── files.js            # GET/PUT /api/files/*
│   │   ├── ha.js               # GET /api/ha/*, POST /api/ha/service
│   │   ├── dev.js              # POST /api/dev/start|stop, GET /api/dev/errors
│   │   └── build.js            # POST /api/build, /api/packages/install
│   └── services/
│       ├── ha-connection.js    # WebSocket to Home Assistant
│       ├── vite-manager.js     # Spawns/manages Vite dev server
│       └── build-manager.js    # npm install + vite build
├── config.example.json         # { deviceCode, dashboardDir, haUrl, haToken }
├── systemd/
│   └── touchscreen-server.service
├── avahi/
│   └── touchscreen.service     # mDNS advertisement
└── package.json
```

### Config (`config.json`)

```json
{
  "deviceCode": "ABCD-1234",
  "dashboardDir": "/opt/touchscreen/dashboard",
  "haUrl": "ws://homeassistant.local:8123",
  "haToken": "..."
}
```

### Services

**HA Connection**: Maintains persistent WebSocket to Home Assistant. Writes `ha-catalog.json` to the dashboard's `src/lib/` directory. Broadcasts entity state changes over the `/ws` WebSocket endpoint.

**Vite Manager**: Spawns `npx vite --host 0.0.0.0` in the dashboard directory. Captures stderr for AI error reporting. Manages lifecycle (start/stop/restart).

**Build Manager**: Runs `npm install` and `npx vite build` in the dashboard directory. Used for "publishing" a dashboard to production (static files served without Vite).

---

## 5. Dev Orchestrator (`scripts/`)

### Entry Point

`scripts/dev.mjs` → launches `scripts/dev-tui/App.mjs` (Ink React TUI)

### Service Manager

`scripts/dev-tui/services.mjs` manages five services:
1. **API**: Vercel dev server for `app/`
2. **Expo**: Expo dev server for `mobile-new/`
3. **Pi Agent**: SSH to Pi running device-agent
4. **Vite**: Triggered via Pi's `/api/dev/start`
5. **Sync**: File watcher + rsync for `device-agent/` and `sandbox-template/`

### Preflight Checks

- SSH connectivity to Pi
- `vercel` CLI installed
- Home Assistant reachable (optional)

---

## 6. Pi Deployment Layout

```
/opt/touchscreen/
├── server/                 # device-agent (rsynced)
│   ├── src/
│   ├── node_modules/
│   └── package.json
├── dashboard/              # sandbox-template (rsynced)
│   ├── src/
│   ├── dist/               # Built static files (production)
│   ├── node_modules/
│   └── package.json
└── config.json             # Device configuration
```

Systemd runs `touchscreen-server.service` which starts the device-agent Node process. The agent serves the dashboard (either via Vite in dev mode or static files in production).

---

## 7. Key Dependencies by Package

### Cloud App (`app/`)
- `next` 16, `react` 19, `@ai-sdk/gateway`, `ai` (Vercel AI SDK)
- `better-auth` (auth), `drizzle-orm` + `@neondatabase/serverless` (DB)
- `stripe` (payments), `resend` (email)
- `@tailwindcss/postcss` (v4)

### Mobile (`mobile-new/`)
- `expo` 54, `expo-router`, `@ai-sdk/react` (useChat)
- `react-native-zeroconf` (mDNS)

### Dashboard (`sandbox-template/`)
- `vite` 6, `react` 19, `home-assistant-js-websocket`
- `tailwindcss` 3, `lucide-react`

### Device Agent (`device-agent/`)
- `fastify` 5, `@fastify/cors`, `@fastify/websocket`
- `home-assistant-js-websocket`
