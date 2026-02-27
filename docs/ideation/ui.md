# UI Architecture

## The question

Should we use Home Assistant's native dashboard system (Lovelace + Mushroom), or build a custom React frontend that talks to HA via API?

---

## Option A: HA Native (Lovelace + Mushroom)

[Mushroom](https://github.com/piitaya/lovelace-mushroom) is the community gold standard — 4.8k stars, beautiful cards, active development.

**Pros:**
- Already looks great
- Familiar to HA users
- Zero integration work — it *is* HA

**Problems:**
- Built on Lit web components, tightly coupled to HA's frontend
- Lovelace config is YAML/JSON — not what AI code generators output
- v0 and similar tools generate React, not Lovelace YAML
- Can't easily run standalone on device without embedding HA's entire frontend
- Customisation is constrained to what Mushroom/Lovelace expose

**Verdict:** Beautiful, but not AI-generatable. Defeats the core USP.

---

## Option B: Custom React frontend + HA API

Build a standalone React app. AI generates the UI. Device runs it locally. Communicates with HA over the network.

### Is this feasible?

**Yes.** Home Assistant exposes:

| API | Purpose |
|-----|---------|
| REST API | Get/set entity states, call services, fire events |
| WebSocket API | Real-time state subscriptions, low latency |
| Long-lived access tokens | Auth without user interaction |

Everything you need to control a home is available:
- `GET /api/states` — all entity states
- `POST /api/services/{domain}/{service}` — turn on lights, set temp, etc.
- WebSocket for live updates — light changed? UI updates instantly

### Why React specifically?

| Reason | Detail |
|--------|--------|
| v0 outputs React | AI generation pipeline already exists |
| Tailwind + shadcn/ui | v0's default stack — clean, responsive, themeable |
| Static build | `npm run build` → deploy HTML/JS/CSS to device |
| Offline-capable | Once built, no server needed — just API calls to HA |
| Huge ecosystem | Component libraries, testing, tooling |

### How it works

1. User prompts in companion app: "Dark theme, room-by-room, show lights and climate"
2. v0 API generates React components targeting HA entity types
3. Build step compiles to static assets
4. Assets pushed to device over WiFi
5. Device renders UI in a browser runtime (Chromium/WebView)
6. UI calls HA REST/WebSocket API directly on local network

---

## Option C: Hybrid

Use Mushroom-inspired *design language* but in React. Not the actual Mushroom code — just the aesthetic.

**Pros:**
- Familiar look for HA users
- AI-generatable
- Best of both worlds

**Cons:**
- More design work upfront to establish component library
- Risk of looking like a knockoff

---

## Recommendation

**Option B — custom React frontend.**

The entire product USP depends on AI-generated interfaces. That means React (or similar). HA's API is more than capable of supporting a standalone frontend.

Mushroom is inspiration, not infrastructure. Take the design sensibility — clean cards, consistent spacing, icon-driven — and build React components that AI can generate.

### Key architectural decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Framework | React | v0 compatibility, AI-generatable |
| Styling | Tailwind CSS | v0 default, utility-first, themeable |
| HA communication | WebSocket + REST | Real-time updates + service calls |
| Auth | Long-lived access token | Set once during setup, stored on device |
| Runtime | Embedded Chromium / WebView | Renders React app on device |
| Build | Static export | No server on device, just files |

### What to build

1. **Component library** — Cards for lights, climate, cameras, locks, media, sensors
2. **Layout system** — Grid-based, AI can arrange components
3. **Theme system** — Light/dark, colour customisation
4. **HA adapter** — Thin layer between React components and HA API
5. **Prompt template** — System prompt for v0 that understands HA entities and our components

---

## Open questions

- [ ] Can v0 API accept a custom component library as context?
- [ ] What browser runtime works best on target hardware?
- [ ] Latency: WebSocket on local network — test real-world performance
- [ ] How to handle HA entity discovery (auto-detect what the user has)
