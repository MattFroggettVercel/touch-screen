# Touch Screen Product - Initial Thoughts

## What
A high-quality touch screen device for home automation, designed to work seamlessly with Home Assistant.

## Why
Current market lacks a premium, purpose-built touch interface for Home Assistant.

## Form Factor
- **Freestanding option** — desk/counter use
- **Plaster-in frame** — flush wall mount for high-end installs

## Core Requirements
- Flawless Home Assistant integration
- **Offline-capable** — device talks directly to HA instance via WiFi, no internet dependency
- UI stored locally on device

## Multi-Device
- Support for multiple screens in one home
- Managed together via companion app

**Open question:** Do devices communicate with each other, or only via HA?
- Direct mesh: sync state, handoff interactions
- HA-only: simpler, HA is the single source of truth
- Likely start with HA-only, add mesh later if needed

## AI-Generated UI
- Use v0 platform API (or similar) to generate custom interfaces
- User prompts for their ideal dashboard → AI builds it

## Companion App
1. **First boot:** Bluetooth pairing to configure WiFi credentials
2. **Ongoing:** WiFi connection to push UI updates to device

## Pricing Strategy

| Approach | Notes |
|----------|-------|
| Hardware at/near cost | Drive adoption, lower barrier |
| AI prompting subscription | Monthly recurring revenue |
| "Buy forever" tier | ~1 prompt/month included |
| 30-day trial | Let users explore before committing |

**Open questions:**
- Optimal subscription price point?
- Trial prompt limit?
- Balance between MRR and perceived value
