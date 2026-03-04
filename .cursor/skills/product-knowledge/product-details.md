# TouchScreen Product Details Reference

## 1. Mobile App Screen Inventory

| Screen | Route | Purpose | Key Actions |
|--------|-------|---------|-------------|
| Entry | `/` | Auth gate | Redirect to tabs or sign-in |
| Sign-in | `/(auth)/sign-in` | Authentication | Magic link, Apple, Google |
| Device list | `/(tabs)/index` | All devices | View status, tap to open, add new |
| Explore | `/(tabs)/explore` | Discovery | Placeholder (future) |
| Settings | `/(tabs)/settings` | Account | Email, name, sign out |
| Setup: Scan | `/setup/scan` | Find Pi AP | Connect phone to `TouchScreen-XXXX` |
| Setup: WiFi select | `/setup/wifi-select` | Choose network | List networks from Pi scan |
| Setup: WiFi password | `/setup/wifi-password` | Enter credentials | Send to Pi |
| Setup: Connecting | `/setup/connecting` | Wait | Pi joins home WiFi, mDNS discovery |
| Setup: Complete | `/setup/complete` | Name device | Choose location, provision |
| Device detail | `/device/[id]` | Device hub | Status, HA connection, edit/settings |
| Edit dashboard | `/device/[id]/edit` | AI editor | Chat, tool execution, publish |
| HA entities | `/device/[id]/ha-entities` | Entity browser | Browse all entities from HA |
| Device settings | `/device/[id]/settings` | Config | Name, HA URL, build, remove device |
| Test device | `/test-device` | Dev/testing | Internal testing screen |

## 2. Web App Page Inventory

| Page | Route | Auth Required | Purpose |
|------|-------|---------------|---------|
| Landing | `/` | No | Marketing, hero, buy CTAs |
| Demo | `/demo` | No | Interactive sandbox demo |
| Sign-in | `/sign-in` | No | Auth page |
| App dashboard | `/app` | Yes | Device list, credit balance |
| Checkout | `/checkout` | Yes | Variant picker, Stripe redirect |
| Order | `/order` | Yes | Order confirmation |
| Register device | `/register/[code]` | Yes | Link device to account |
| Device detail | `/app/device/[code]` | Yes | Web device view |

## 3. Credit System Details

### How Credits Work
- User starts with 10 credits (bundled with hardware purchase)
- Each AI chat message costs 1 credit
- Deducted at the start of `/api/chat` before AI processing
- Balance checked via `GET /api/credits`
- 402 status returned when insufficient credits

### Credit Storage
- `credit_balances` table: `userId`, `balance`
- `credit_transactions` table: `userId`, `amount`, `type`, `description`, `createdAt`
- Transaction types: `purchase` (positive), `usage` (negative)

### Planned Credit Packs (Not Yet Implemented)
| Pack | Price | Per-Credit |
|------|-------|------------|
| 10 credits | £8 | £0.80 |
| 25 credits | £15 | £0.60 |
| 50 credits | £25 | £0.50 |
| Unlimited/mo | £5/month | — |

## 4. Checkout Flow Details

### Current Implementation
1. User visits `/checkout`
2. Selects variant (Freestanding £99 / Plaster-in £89)
3. Selects colour (Freestanding only: Charcoal, Arctic White, Slate)
4. "Buy Now" → creates Stripe Checkout Session
5. Redirect to Stripe-hosted payment
6. On `checkout.session.completed` webhook:
   - Credit 10 AI credits to user
   - Create order record
7. Redirect to `/order` confirmation page

### Order Confirmation
- "Order Confirmed" with order details
- Shows "10 AI credits ready"
- CTAs: "Start building your dashboard", download companion app
- Shipping information

## 5. Auth Flow Details

### Methods
- **Magic link**: Enter email → receive link → sign in
- **Apple sign-in**: OAuth (web + mobile)
- **Google sign-in**: OAuth (web + mobile)

### Session
- Better Auth manages sessions
- Cookie-based (web), token-based (mobile via Expo plugin)
- Middleware protects: `/app`, `/checkout`, `/order`, `/register`, `/demo`

## 6. Device Registration Flow

### Via Web
1. User receives device with printed code (e.g. `ABCD-1234`)
2. Visits `/register/ABCD-1234` or scans QR
3. Page checks device status (available / already owned / error)
4. User picks location name
5. Device linked to account

### Via Mobile
1. Setup wizard provisions device (WiFi + naming)
2. Calls `POST /api/devices/register` with device code + name
3. Device appears in device list

## 7. Demo Experience

### Flow
1. No sign-up required
2. Visit `/demo` → sandbox spins up
3. Mock HA entities (no real device needed)
4. Same chat UI as real editing
5. AI generates dashboard in sandbox
6. Live preview in iframe
7. CTA: "Get your own TouchScreen"

### Technical
- Vercel Sandbox (ephemeral container)
- Tools execute server-side (unlike real flow)
- No credits consumed
- Uses `POST /api/demo/chat`

## 8. Marketing & Positioning

### Landing Page Sections
1. **Hero** — "Your smart home, your interface" + device photo
2. **Product** — hardware shots, specs
3. **How it works** — 3-step: describe → AI builds → touch to control
4. **Features** — AI-powered, privacy, touch-optimised, premium
5. **Privacy** — local-first, no cloud, data stays home
6. **Buy** — variant picker with prices, add to cart

### Key Marketing Claims
- "Describe your perfect dashboard in plain language"
- "Your data stays in your home"
- "No subscriptions required" (credit model)
- "Premium hardware, not a tablet in a case"
- "Works with your existing Home Assistant setup"

### Privacy Messaging
- Dashboard runs 100% locally
- Talks directly to Home Assistant over WiFi
- No cloud dependency after initial setup
- Entity data never leaves the network (AI reads catalog on-device)

## 9. Product Roadmap Signals (from docs/)

From planning documents and code comments:

- **Credit packs** — pricing defined, checkout not wired up
- **Subscription tier** — £5/month unlimited, not implemented
- **Other platforms** — Hubitat, SmartThings, HomeKit mentioned as future
- **Explore tab** — placeholder in mobile app, intended for community/templates
- **Dashboard templates** — referenced in docs as future feature
- **Multi-device management** — cloud tracks multiple devices per account

## 10. Hardware Specs

| Spec | Value |
|------|-------|
| Display | 4" IPS, 720x720px, capacitive touch |
| Physical size | 84x84mm display area |
| PPI | ~254 |
| Compute | Raspberry Pi (Compute Module) |
| Connectivity | WiFi (2.4/5GHz), Ethernet (optional) |
| Power | USB-C |
| Variants | Freestanding (3 colours), Plaster-in |
