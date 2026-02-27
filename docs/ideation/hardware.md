# Hardware Analysis

## Architecture Overview

| Phase | Compute | Display | Purpose |
|-------|---------|---------|---------|
| Prototyping | Raspberry Pi 4 | HDMI square touchscreen | Validate performance, develop software |
| Production | Raspberry Pi Compute Module | Square capacitive touchscreen | Final product |

---

## Compute Module Selection

The production device needs a Raspberry Pi Compute Module. Two generations are available:

### Raspberry Pi Compute Module 4 (CM4)

- **SoC:** BCM2711 — quad-core Cortex-A72 @ 1.5GHz
- **GPU:** VideoCore VI — hardware H.265 decode, OpenGL ES 3.1
- **RAM:** 1GB / 2GB / 4GB / 8GB LPDDR4
- **Storage:** Lite (no eMMC, uses SD) or 8GB / 16GB / 32GB eMMC
- **WiFi:** Optional — BCM43456, dual-band 802.11ac + Bluetooth 5.0
- **Display:** 1× HDMI 2.0 (up to 4Kp60), 2× MIPI DSI, 2× MIPI CSI
- **Form factor:** 55mm × 40mm, 100-pin mezzanine connectors

#### CM4 Pricing (official MSRP)

| RAM | Storage | WiFi | Price |
|-----|---------|------|-------|
| 1GB | Lite | No | $25 |
| 1GB | Lite | Yes | $30 |
| 1GB | 8GB eMMC | Yes | $35 |
| 2GB | Lite | No | $30 |
| 2GB | Lite | Yes | $35 |
| 2GB | 8GB eMMC | Yes | $40 |
| 4GB | Lite | Yes | $45 |
| 4GB | 8GB eMMC | Yes | $50 |
| 8GB | Lite | Yes | $55 |
| 8GB | 8GB eMMC | Yes | $60 |

### Raspberry Pi Compute Module 5 (CM5)

Released November 2024. Significant performance uplift.

- **SoC:** BCM2712 — quad-core Cortex-A76 @ 2.4GHz
- **GPU:** VideoCore VII — OpenGL ES 3.1, Vulkan 1.2
- **RAM:** 2GB / 4GB / 8GB LPDDR4X
- **Storage:** Lite or 16GB / 32GB / 64GB eMMC
- **WiFi:** Optional — dual-band 802.11ac + Bluetooth 5.0
- **Display:** 1× HDMI 2.0 (up to 4Kp60), 2× MIPI DSI, 2× MIPI CSI
- **Form factor:** Same 55mm × 40mm, same connector footprint as CM4 — **drop-in replacement**

#### CM5 Pricing (official MSRP)

| RAM | Storage | WiFi | Price |
|-----|---------|------|-------|
| 2GB | Lite | No | $45 |
| 2GB | Lite | Yes | $50 |
| 2GB | 16GB eMMC | Yes | $55 |
| 4GB | Lite | Yes | $55 |
| 4GB | 32GB eMMC | Yes | $65 |
| 8GB | Lite | Yes | $65 |
| 8GB | 32GB eMMC | Yes | $75 |

### Which Compute Module?

The workload is: Chromium kiosk → single tab → React + Tailwind static site → WebSocket to HA.

**Key considerations:**

1. **RAM is the bottleneck, not CPU.** Chromium on Linux uses ~300-500MB alone. The OS takes ~200-300MB. A 1GB CM4 would technically run but leaves no headroom — risk of OOM kills, tab crashes, or swap-induced lag. **2GB is the minimum for a smooth, premium feel.**

2. **WiFi is required.** Device talks to Home Assistant over the local network. No WiFi variant is not an option.

3. **eMMC vs Lite (SD card).** For a consumer product that's always on, SD cards are a reliability liability — they wear out, corrupt, and are slow. **eMMC is strongly recommended for production.** The Lite variant is fine for prototyping.

4. **CM4 vs CM5 performance.** The Cortex-A76 in the CM5 is roughly 2-3× faster per-core than the Cortex-A72 in the CM4. This directly impacts Chromium rendering speed, CSS animation smoothness, and WebSocket event handling latency. For a "premium, not laggy" product, the CM5 is noticeably better.

#### Recommendation

| Option | Module | Price | Notes |
|--------|--------|-------|-------|
| **Budget pick** | CM4 — 2GB, 8GB eMMC, WiFi | $40 | Adequate. May feel slightly sluggish on complex dashboards. Cheapest viable option. |
| **Recommended** | CM5 — 2GB, 16GB eMMC, WiFi | $55 | Best value. 2-3× faster rendering. Smooth 60fps UI. Future-proof. |
| Overkill | CM5 — 4GB, 32GB eMMC, WiFi | $65 | Only if dashboards become very complex or we add background services. |

**Verdict:** Start prototyping on a Pi 4 (which matches CM4 performance). If the UI feels butter-smooth on the Pi 4, the CM4 2GB is sufficient. If there's any perceptible lag or jank, jump to CM5 — the $15 difference is worth it for product quality.

The CM5 is the safer bet. At volume the price difference per unit is marginal compared to the retail price, and the user experience gap is significant.

---

## Display Selection

### Requirements

- Capacitive touch (not resistive — feel matters)
- Square or near-square portrait aspect ratio
- 4-5" diagonal — wall panel / countertop size
- IPS panel for viewing angles
- Compatible with both Pi 4 (prototyping) and CM4/CM5 (production)
- Ideally available at volume for manufacturing

### Candidates

#### 1. Pimoroni HyperPixel 4.0 Square (Touch)

| Spec | Value |
|------|-------|
| Size | 4.0" diagonal |
| Resolution | 720 × 720 |
| Panel | IPS |
| Touch | Capacitive (I2C) |
| Interface | DPI (parallel, via GPIO HAT header) |
| Price | ~£50 / ~$55 |
| Availability | Pimoroni, Adafruit |

**Pros:**
- Beautiful display, well-reviewed
- Purpose-built for Raspberry Pi
- High pixel density at 4" (254 PPI)

**Problems:**
- **Uses DPI interface via GPIO pins** — consumes nearly all GPIO
- **Not compatible with CM4/CM5 directly** — the CM4 doesn't expose a standard 40-pin HAT header; it uses board-to-board connectors. Would need a carrier board that breaks out the DPI pins in HAT format.
- Pimoroni is a boutique manufacturer — availability at volume for a production product is uncertain
- **Verdict: Good for prototyping on Pi 4, problematic for production.**

#### 2. Generic 4" IPS Square HDMI Capacitive Touchscreen (720×720)

| Spec | Value |
|------|-------|
| Size | 4.0" diagonal |
| Resolution | 720 × 720 |
| Panel | IPS |
| Touch | Capacitive (USB) |
| Interface | HDMI (display) + USB (touch) |
| Price | ~£30-35 / ~$35-40 |
| Availability | The Pi Hut, Waveshare, AliExpress |

**Pros:**
- Standard HDMI + USB — works with literally anything
- Works with Pi 4 (prototype) AND CM4/CM5 (production) without modification
- Cheapest option
- Available from multiple suppliers — easier to source at volume
- Square 720×720 format

**Problems:**
- HDMI + USB means two cables — slightly messier integration vs DSI
- USB touch adds a marginal amount of latency vs I2C/DSI touch (typically <10ms, unlikely to be perceptible)
- Build quality varies by supplier — need to vet manufacturer
- **Verdict: Most practical option. Works everywhere, cheap, available.**

#### 3. DSI Square Touchscreen (if available)

MIPI DSI would be the ideal interface for production:
- Native to CM4/CM5 (dedicated connector, no GPIO consumed)
- Touch controller integrated over I2C (lower latency than USB)
- Single ribbon cable — clean integration
- Lower power than HDMI

**Problem:** Square DSI touchscreens are rare. Most DSI panels are 16:9 or 4:3. This is worth monitoring — if a 720×720 DSI panel becomes available (e.g. from Waveshare or a Chinese supplier), it would be the ideal production choice.

**Verdict: Ideal but currently hard to source in square format. Revisit.**

#### 4. Custom Panel (Production, Volume)

At volume (1,000+ units), sourcing a bare 4" 720×720 IPS panel + capacitive touch digitizer from a Chinese LCD manufacturer (e.g. via Alibaba) is realistic:
- Typical cost: $8-15/unit for panel + touch + driver board
- Interface: MIPI DSI or HDMI — specify at order
- MOQ: Usually 100-500 units
- Lead time: 4-8 weeks

**This is the long-term play.** For prototyping and first production runs, use the off-the-shelf HDMI option. Once volume justifies it, switch to a custom-sourced DSI panel.

### Display Recommendation

| Phase | Display | Interface | Price | Why |
|-------|---------|-----------|-------|-----|
| **Prototype** | Generic 4" 720×720 HDMI square | HDMI + USB | ~£30 | Works with Pi 4 out of the box. Cheap. Easy. |
| **First production run** | Same HDMI display, or Waveshare equivalent | HDMI + USB | ~£25-30 at volume | Proven, available, no risk |
| **Scale (1k+ units)** | Custom-sourced DSI panel | MIPI DSI + I2C | ~£8-15 at volume | Cleaner integration, lower cost, better margins |

---

## Prototyping Setup — What to Buy

For the Pi 4 prototype build:

| Item | Est. Price | Notes |
|------|-----------|-------|
| Raspberry Pi 4 (2GB or 4GB) | £35-55 | 2GB matches production target; 4GB gives headroom |
| 4" 720×720 HDMI square capacitive touchscreen | £30-35 | From The Pi Hut or Waveshare |
| microSD card (32GB) | £8 | For Pi OS + Chromium kiosk |
| USB-C power supply (5V 3A) | £10 | Official Pi PSU recommended |
| Micro-HDMI to HDMI adapter/cable | £5 | Pi 4 uses micro-HDMI |
| **Total** | **~£90-115** | |

### Prototype objectives

1. Boot into Chromium kiosk displaying the React dashboard
2. Validate touch responsiveness — tap, swipe, scroll
3. Measure perceived latency on UI interactions
4. Test WebSocket connection to a Home Assistant instance
5. Assess viewing angles, brightness, and overall display quality
6. Determine if CM4 (A72) performance is sufficient, or if CM5 (A76) is needed

---

## Production BOM Estimate

For the final product at initial volumes (~100-500 units):

| Component | Est. Cost | Notes |
|-----------|----------|-------|
| CM5 2GB, 16GB eMMC, WiFi | ~$55 / ~£43 | Recommended compute module |
| 4" 720×720 capacitive touchscreen | ~$30 / ~£24 | HDMI initially, DSI at scale |
| Custom carrier board (PCB) | ~$5-10 / ~£4-8 | Designed for CM5 + display connector |
| Enclosure (injection moulded) | ~$3-5 / ~£2-4 | Or 3D printed for first run |
| Power supply / USB-C connector | ~$2-3 / ~£2 | 5V input |
| Misc (cables, connectors, heatsink) | ~$3-5 / ~£3-4 | |
| **Total BOM** | **~$98-108 / ~£78-85** | Per unit, before assembly |

At volume (1k+ with custom DSI panel): BOM drops to ~$65-80 / £52-64.

With a retail price of £80-120 (from pricing doc), the margin is tight at initial volumes but healthy at scale. **This validates the "hardware at small margin, revenue from prompts" model.**

---

## Carrier Board

The CM4/CM5 requires a carrier board — this is the custom PCB that the compute module plugs into.

**For prototyping:** Use the official Raspberry Pi CM4 IO Board (~£35). Has HDMI, USB, DSI, CSI, GPIO, Ethernet, SD slot — everything needed to test.

**For production:** Design a minimal custom carrier board with only what's needed:
- CM4/CM5 mezzanine connector
- HDMI or DSI connector (for display)
- USB connector (for touch input, if HDMI display)
- USB-C power input (5V)
- WiFi antenna pad (or use CM5's onboard antenna)
- No Ethernet, no GPIO headers, no camera — stripped to essentials

Custom carrier boards are straightforward to design (KiCad, open-source CM4 reference designs available) and cheap to manufacture ($5-10/unit at volume).

---

## Open Questions

- [ ] **CM4 vs CM5 — prototype test.** Run the dashboard on Pi 4 (CM4-equivalent). Is it smooth enough? If yes, CM4 saves ~$15/unit. If no, CM5 is the answer.
- [ ] **Display sourcing at volume.** Can we get the 720×720 HDMI display at £20 or less in batches of 500+? What about a DSI variant?
- [ ] **Always-on power draw.** What's the idle wattage? This is a wall-mounted device — efficiency matters for thermals and user electricity cost.
- [ ] **Heatsink / thermal design.** CM5 runs hotter than CM4. Enclosed in a wall mount with no airflow — need passive cooling solution.
- [ ] **Audio.** Do we need a speaker? Notification sounds, music preview, voice feedback? If yes, adds I2S DAC + small speaker to BOM.
- [ ] **Ambient light sensor.** Auto-brightness for the display? Small addition but big UX improvement.
- [ ] **Physical buttons.** Volume, brightness, or a home button? Or purely touch-driven?
- [ ] **USB-C vs hardwired power.** Wall-mounted units might benefit from a barrel jack or direct wire rather than USB-C.
