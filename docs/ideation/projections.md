# Projections

## Product Development

Minimal upfront cost.
- Prototypes: 3D printed in-house
- Software: built by founder
- Manufacturing: Chinese factory, straightforward assembly

**Estimated dev cost:** <£5k to first production-ready unit.

---

## Total Addressable Market

### Home Assistant (primary target)

| Metric | Estimate | Source |
|--------|----------|--------|
| Active installations | ~1M+ | HA analytics, community estimates |
| YoY growth | 30-50% | Consistent multi-year trend |
| Nabu Casa subscribers | 100k+ | Paying $6.50/mo for cloud features |
| r/homeassistant members | 500k+ | Reddit, highly engaged |

**Who they are:**
- Technical but not necessarily developers
- Privacy-conscious — chose HA specifically to avoid cloud dependency
- Willing to spend on quality (Zigbee coordinators, Raspberry Pi setups, etc.)
- Already invested in automation — not convincing them to start, just to upgrade

**Why they'd buy:**
- Current dashboard options require YAML/CSS — this removes that friction
- No premium wall-mounted option exists in this ecosystem
- AI generation is genuinely novel — early adopters love new tech

### Funnel math (Home Assistant only)

| Stage | Number | Assumption |
|-------|--------|------------|
| HA installations | 1,000,000 | Base |
| Aware of product | 100,000 | 10% reach via Reddit/YouTube/forums |
| Interested | 20,000 | 20% of aware — want a wall panel |
| Convert Y1 | 1,000-4,000 | 5-20% of interested — reasonable range |

Even pessimistic assumptions yield 1,000+ units in Year 1.

### Adjacent markets (Year 2+)

| Platform | Users | Opportunity |
|----------|-------|-------------|
| SmartThings | 60M+ devices | Samsung ecosystem, less technical users |
| Hubitat | 100k+ | Similar to HA, local-first crowd |
| Apple HomeKit | 50M+ | Premium users, would pay for premium hardware |
| Direct integrations (Hue, LIFX, etc.) | 100M+ | No hub required — broader appeal |

**The unlock:** AI-generated interfaces work regardless of backend. Once HA integration is proven, expanding to other platforms is primarily a software effort — same hardware, same AI, different API calls.

### Total market size

| Segment | TAM | Realistic SAM |
|---------|-----|---------------|
| Home Assistant | ~1M users | 50k potential buyers |
| Other local-first (Hubitat, etc.) | ~200k users | 10k potential buyers |
| Mainstream smart home | 300M+ households | 1M+ if product goes mass-market |

**Year 1 focus:** Capture 1-5% of HA "would buy a wall panel" segment.
**Year 2-3:** Expand to adjacent platforms, 10x addressable market.
**Long-term:** If AI interface resonates, mainstream smart home is the ceiling — not the floor.

---

## Marketing

### Channels (low cost)
| Channel | Cost | Notes |
|---------|------|-------|
| Reddit (r/homeassistant) | Free | 500k+ members, highly engaged |
| HA Community forums | Free | Direct access to target users |
| YouTube reviews | Gifted units | HA YouTubers have loyal audiences |
| Word of mouth | Free | Tinkerers share with tinkerers |

### Channels (paid, later)
| Channel | Cost | Notes |
|---------|------|-------|
| Google Ads | £5-15 CPC | "home assistant dashboard" keywords |
| Facebook/Instagram | £10-30 CPA | Target smart home interest groups |
| Trade shows (CES, etc.) | £5-10k | Brand visibility, press coverage |

### Realistic Year 1 budget
- **£0-2k** — organic only, community seeding
- Focus on product quality → reviews → organic growth

---

## Revenue Scenarios

Based on £99 device + credit model.

### Assumptions
| Variable | Conservative | Moderate | Optimistic |
|----------|--------------|----------|------------|
| Units sold Y1 | 500 | 1,500 | 4,000 |
| Hardware margin | £20 | £25 | £30 |
| % buying credits | 30% | 50% | 60% |
| Avg credit spend/user | £10 | £20 | £30 |

### Year 1 Revenue

| Scenario | Hardware | Credits | Total |
|----------|----------|---------|-------|
| Conservative | £10,000 | £1,500 | **£11,500** |
| Moderate | £37,500 | £15,000 | **£52,500** |
| Optimistic | £120,000 | £72,000 | **£192,000** |

### Year 2-3 (if traction)
- Multi-device households: 1.5-2x revenue per customer
- Platform expansion: 2-3x addressable market
- Credit revenue compounds as installed base grows

---

## Unit Economics

| Item | Cost | Price | Margin |
|------|------|-------|--------|
| Hardware (BOM est.) | £50-60 | £99 | £39-49 |
| 10 credits (API cost ~£2) | £2 | £8 | £6 |
| 25 credits (API cost ~£5) | £5 | £15 | £10 |
| Subscription (API ~£3/mo) | £3 | £5/mo | £2/mo |

**Blended margin target:** 40-50% across hardware + software.

---

## Scaling Path

1. **0-500 units:** Validate product-market fit. Organic marketing only.
2. **500-2,000 units:** Invest in YouTube reviews, community presence.
3. **2,000-10,000 units:** Paid ads, expand to other platforms.
4. **10,000+ units:** Trade channel (installers), international expansion.

---

## Risks

| Risk | Mitigation |
|------|------------|
| Low credit uptake | Hardware margin covers costs alone |
| HA changes API/breaks integration | Stay close to community, adapt fast |
| Competitor enters market | First-mover + AI interface is hard to copy well |
| v0 API pricing changes | Build abstraction layer, can switch providers |

---

## Analysis

### Why this works

**Low risk entry:**
- Near-zero dev cost means break-even is achievable at <500 units
- No external funding required — can bootstrap entirely
- Hardware margin alone sustains the business even if credits underperform

**Built-in growth loops:**
- HA community is tight-knit — good products spread organically
- Each device sold → potential credit revenue for years
- Multi-device households multiply lifetime value without extra acquisition cost

**Defensible position:**
- AI interface generation is genuinely hard to do well
- Privacy-first, local-first positioning appeals to this audience specifically
- First mover in "AI-generated smart home UI" category

### What could go wrong

- **Credit model fails:** Users set up once, never buy more. Mitigation: hardware margin still works.
- **Market stays niche:** HA never goes mainstream, ceiling is low. Mitigation: expand to other platforms.
- **Competition:** Big player (Google, Amazon) launches similar product. Mitigation: they won't do local-first, privacy-respecting — that's our moat.

### The numbers that matter

| Metric | Target | Why |
|--------|--------|-----|
| Hardware margin | >£30/unit | Covers ops, allows reinvestment |
| Credit attach rate | >40% | Validates software value |
| Units Y1 | >1,000 | Proves product-market fit |
| CAC | <£10 | Must stay organic-first |

---

## Conclusion

This is a low-risk, high-upside opportunity.

**Best case:** £50-200k Year 1 revenue, scaling to £500k+ as platform expands. Business becomes self-sustaining quickly with potential for meaningful growth.

**Worst case:** Sell 500 units, break even, learn a lot. Hardware margin means you don't lose money even if credits don't take off.

**The bet:** Home Assistant users want a premium touch interface, and AI-generated UIs unlock mass-market appeal. Both are reasonable assumptions — and cheap to test.

**Recommendation:** Build the MVP, seed 20-50 beta units in the community, validate credit usage, then scale.

---

## Data to Validate

- [ ] Actual v0 API cost per generation
- [ ] Survey HA community on willingness to pay
- [ ] Chinese manufacturer quotes for BOM
- [ ] Beta test with 20-50 users for credit usage patterns
