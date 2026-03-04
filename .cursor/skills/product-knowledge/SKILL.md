---
name: product-knowledge
description: Product context for TouchScreen — user journeys, features, business model, UX flows, terminology, and product decisions. Use when making product decisions, writing copy, designing UI, working on user-facing features, onboarding, checkout, credits, or anything requiring understanding of who the user is and what the product does.
---

# TouchScreen Product Knowledge

## What TouchScreen Is

A premium touch panel for Home Assistant. Users describe the dashboard they want in plain English; AI generates it. No code, no YAML, no config files.

**Tagline**: "Your smart home, your interface"

**Core loop**: User speaks naturally → AI edits dashboard code → Vite HMR updates the 720x720px display in real time → user publishes when happy.

## Target User

Home Assistant users (~1M+ installations) who want a dedicated wall panel but don't want to write YAML or CSS. They're technical enough to run HA and Zigbee, privacy-conscious, and willing to pay for quality hardware. They are not necessarily developers.

## Product Variants

| Variant | Price | Description |
|---------|-------|-------------|
| Freestanding | £99 | Desktop/counter mount. Colours: Charcoal, Arctic White, Slate |
| Plaster-in | £89 | Flush wall mount |

Both include 10 AI credits.

## Business Model

| Revenue | Mechanism |
|---------|-----------|
| Hardware margin | Device sold above cost |
| AI credits | 1 credit = 1 AI prompt. 10 bundled with purchase |

**Planned (not yet live):** Credit packs (10 for £8, 25 for £15, 50 for £25), optional £5/month unlimited subscription.

Credits never expire. 402 error when balance reaches 0.

## Terminology

| Term | Meaning |
|------|---------|
| Dashboard | The React UI running on the device display |
| Edit / Edit Dashboard | AI chat editing flow (Vite dev server running) |
| Publish | Build static assets and deploy to device |
| Editing mode | Vite dev server active, live preview |
| Production mode | Static build served, no dev server |
| Credits / AI credits | Currency for AI prompts |
| Device code | Unique identifier (e.g. ABCD-1234) |
| Provision / Register | Link a physical device to a user account |
| Entity | A Home Assistant entity (light, sensor, climate, etc.) |
| Card | A dashboard component (LightCard, ClimateCard, etc.) |
| Companion app | The mobile app (Expo) |
| Freestanding | Desktop/counter device variant |
| Plaster-in | Flush wall-mounted variant |

## User Journeys

### Purchase → Setup

```
Landing page → Sign up → Choose variant & colour → Stripe checkout
→ Order confirmed (10 credits ready) → Download companion app
→ Receive device → Open app → Add Device → Setup flow → Ready
```

### Device Setup (Mobile App)

1. **Connect** — join Pi's WiFi AP (`TouchScreen-XXXX`)
2. **Select WiFi** — pick home network from Pi's scan
3. **Enter password** — Pi joins home WiFi, drops AP
4. **Reconnect** — phone rejoins home WiFi, mDNS finds Pi
5. **Name** — choose location (Kitchen, Living Room, etc.) or custom
6. **Provision** — device registered to user's account

### Dashboard Editing

1. Tap device in companion app
2. Tap "Edit Dashboard" — starts Vite dev server on Pi
3. Type natural language prompt (e.g. "Show my lights grouped by room")
4. AI reads entity catalog, edits dashboard code
5. Changes appear live on the device display
6. Iterate with more prompts
7. Tap "Publish" — builds static assets, stops dev server

### Demo (No Device Required)

1. Visit `/demo` (no auth needed)
2. Ephemeral sandbox with mock entities
3. Same AI chat experience
4. CTA to buy when done

## Feature Map

### Web App
- Marketing landing page (hero, features, privacy, buy)
- Auth (magic link, Apple, Google sign-in)
- Product configurator (variant + colour)
- Stripe checkout
- Order confirmation with credits
- App dashboard (device list, credit balance)
- Device registration by code
- Interactive demo (Vercel Sandbox)

### Mobile Companion App
- Auth (magic link, Apple, Google)
- Device list (cloud-synced + mDNS discovery)
- Device setup wizard (WiFi provisioning)
- AI dashboard editor (chat interface)
- Live entity browser
- Device settings (name, HA config, build, remove)
- Account settings

### Device
- 720x720px capacitive touch display
- Real-time HA entity display
- Live editing via Vite HMR
- Static production build
- mDNS advertisement for discovery
- Local-only — no cloud dependency after setup

## Dashboard Capabilities

### Supported Entity Cards

| HA Domain | Card | What It Shows |
|-----------|------|---------------|
| `light` | LightCard | Toggle, brightness |
| `climate` | ClimateCard | Temperature, HVAC mode |
| `weather` | WeatherCard | Location, temp, condition, forecast |
| `media_player` | MediaCard | Track, playback controls, volume |
| `sensor` | SensorCard | Value, unit |
| `binary_sensor` | BinarySensorCard | Motion, door, presence state |
| `switch` | SwitchCard | On/off toggle |
| `cover` | CoverCard | Blinds/curtains position |
| `scene` | SceneCard | One-tap scene activation |
| `camera` | CameraCard | Feed, status |

### What AI Can Customise
- Layout and card arrangement
- Which entities to show
- Grouping (by room, by type, custom)
- Visual style (within Tailwind + dark theme)
- New custom components
- Additional npm packages

### Display Constraints
- 720x720px (4" diagonal, ~254 PPI)
- Dark theme: background `#0d0d1a`, surface `#1a1a2e`, accent `#c9a962`
- Touch-optimised: minimum 44px tap targets

## AI Interaction Model

**From the user's perspective:**
- They type what they want in plain language
- The AI understands their Home Assistant setup (reads entity catalog from device)
- Changes appear on the physical display within seconds
- They can iterate ("make the lights bigger", "add my cameras")
- When satisfied, they publish

**What users can ask:**
- "Show my living room lights and thermostat"
- "Add a weather widget at the top"
- "Group everything by room"
- "Make it look more minimal"
- "Add my cameras in a grid"

**Each prompt costs 1 credit.**

## Competitive Position

| Alternative | TouchScreen Advantage |
|-------------|----------------------|
| Generic tablet + case | Purpose-built, no app clutter, premium feel |
| HA Lovelace / Mushroom | No YAML — natural language instead |
| Cloud dashboards | Local-first, private, works without internet |
| DIY solutions | No code, no soldering, polished product |

**Key differentiators:** AI-generated interfaces, local-first privacy, premium hardware with plaster-in option, credit-based pay-per-use pricing.

## Product Constraints

- **HA only** — no Hubitat, SmartThings, or HomeKit support (yet)
- **Same LAN** — phone and device must be on same network for editing
- **Credit-gated** — AI editing requires credits (no free tier beyond demo)
- **No credit top-up** — credit pack purchase not yet implemented in checkout
- **No subscription** — unlimited plan not yet live

## Key Product Files

| Area | Path |
|------|------|
| Landing / marketing | `app/src/app/page.tsx` |
| Demo | `app/src/app/demo/page.tsx` |
| Checkout | `app/src/app/checkout/page.tsx` |
| Order confirmation | `app/src/app/order/page.tsx` |
| Credits API | `app/src/app/api/credits/route.ts` |
| AI system prompt | `app/src/lib/system-prompt.ts` |
| Mobile edit screen | `mobile-new/app/device/[id]/edit.tsx` |
| Mobile setup flow | `mobile-new/app/setup/` |
| Device registration | `app/src/app/register/[code]/page.tsx` |
| Pitch deck | `docs/ideation/pitch/index.html` |
| Product docs | `docs/` |

## Additional Reference

For detailed screen inventories, setup flow internals, and product planning docs, see [product-details.md](product-details.md).

For instructions on updating this skill, see [UPDATE-INSTRUCTIONS.md](UPDATE-INSTRUCTIONS.md).
