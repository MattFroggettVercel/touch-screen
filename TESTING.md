# Testing Guide

## Quick Start (One Command)

From the repo root:

```bash
npm run dev
```

This starts **everything**:

| Label    | What                                   | Where          |
|----------|----------------------------------------|----------------|
| `[api]`  | `vercel dev` (Next.js API)             | localhost:3000  |
| `[expo]` | Expo dev server (mobile)               | Expo Go on phone |
| `[pi]`   | device-agent via SSH (node --watch)    | Pi:3001         |
| `[sync]` | File watcher → auto-rsync to Pi       | —               |

Output is color-coded by label. Press **Ctrl+C** to stop everything (the Pi's systemd service is auto-restored).

### Prerequisites

- SSH key installed on Pi: `ssh-copy-id pi@touchscreen`
- Pi deployed at least once: `./deploy.sh pi@touchscreen`
- `vercel` CLI installed and linked in `app/`
- Expo Go installed on your phone (same WiFi as Mac)

### Custom Pi host

```bash
PI_HOST=pi@192.168.1.50 npm run dev
```

---

## Architecture Overview

```
┌─────────────┐       ┌──────────────┐       ┌───────────────┐
│  Mobile App  │──LAN──│ Device Agent  │──WS──│ Home Assistant │
│  (Expo)      │       │ (Fastify Pi)  │       │  (optional)    │
│  port 8081   │       │  port 3001    │       │  port 8123     │
└──────┬───────┘       └──────────────┘       └───────────────┘
       │
       │  HTTPS
       ▼
┌─────────────┐
│  Cloud App   │
│  (Next.js)   │
│  port 3000   │
└─────────────┘
```

Three services that talk to each other:

1. **Cloud App** (`app/`) — Next.js, auth + AI chat API, runs on Vercel (or `vercel dev` locally)
2. **Device Agent** (`device-agent/`) — Fastify HTTP+WS server, runs on the Pi
3. **Mobile App** (`mobile-new/`) — Expo React Native app, connects to both cloud and device agent over LAN

### The dev inner loop

| What you edit | What happens | Latency |
|---|---|---|
| `app/src/` | `vercel dev` hot-reloads | Instant |
| `mobile-new/` | Expo Fast Refresh on phone | ~1s |
| `device-agent/src/` | fs.watch → rsync → `node --watch` restarts on Pi | ~2-3s |
| `sandbox-template/src/` | fs.watch → rsync → Vite HMR on Pi refreshes preview | ~2-3s |

---

## Manual Setup (individual services)

If you prefer to start services individually instead of using `npm run dev`:

### 1. Cloud App (Next.js)

```bash
cd app
vercel dev
# Runs on http://localhost:3000
```

### 2. Device Agent (on Pi)

Deploy code to Pi and restart the service:

```bash
./deploy.sh pi@touchscreen --restart
```

Or run it locally to simulate the Pi:

```bash
cd device-agent
npm install
cat > config.json << 'EOF'
{
  "deviceCode": "ABCD1234EF",
  "dashboardDir": "../sandbox-template",
  "serverPort": 3001,
  "devPort": 5173,
  "productionPort": 5173,
  "haUrl": "",
  "haToken": ""
}
EOF
DEVICE_CONFIG=./config.json npm run dev
```

> Set `haUrl`/`haToken` if you have a Home Assistant instance reachable from your Mac
> (e.g. `http://homeassistant.local:8123`). Leave them empty to skip HA — the server
> still boots fine, just without live entities.

### 3. Mobile App (Expo)

```bash
cd mobile-new
npm install
EXPO_PUBLIC_API_URL=http://localhost:3000 npx expo start
```

> **Physical phone note:** `localhost` won't work. Use your Mac's LAN IP instead:
>
> ```bash
> ipconfig getifaddr en0
> EXPO_PUBLIC_API_URL=http://192.168.x.x:3000 npx expo start
> ```

---

## Quick Smoke Test (no phone needed)

Verify the device agent and cloud API work end-to-end using curl:

```bash
# 1. Check device agent is up (use Pi IP or localhost if running locally)
curl http://<pi-ip>:3001/api/status | jq

# 2. List files it can serve
curl http://<pi-ip>:3001/api/files/src/Dashboard.tsx | jq

# 3. Start the Vite dev server
curl -X POST http://<pi-ip>:3001/api/dev/start | jq

# 4. Verify it's running
curl http://<pi-ip>:3001/api/dev/status | jq

# 5. Open the dashboard preview in your browser
open http://<pi-ip>:5173

# 6. Test the AI chat
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Add a weather card to the dashboard"}],
    "deviceId": "ABCD1234EF",
    "haContext": { "entities": [], "areas": [] }
  }'
```

---

## End-to-End Flows

| Flow | What happens |
|---|---|
| **Sign in** | Mobile `(auth)/sign-in.tsx` → cloud `POST /api/auth` → magic link email |
| **Device list** | `(tabs)/index.tsx` → `GET /api/devices` from cloud + mDNS scan on LAN |
| **Device status** | Tap device → `device/[id]/index.tsx` → `GET http://<ip>:3001/api/status` |
| **HA entities** | `device/[id]/ha-entities.tsx` → WebSocket `ws://<ip>:3001/ws` |
| **Edit dashboard** | `device/[id]/edit.tsx` → `POST /api/dev/start` → WebView loads `http://<ip>:5173` |
| **AI chat** | Chat bar → `POST /api/chat` with `haContext` → streams tool calls |
| **WiFi setup** | `setup/` wizard → `GET /api/wifi/scan` → `POST /api/wifi/connect` |
