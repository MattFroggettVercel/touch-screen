# Pricing Strategy

## Hardware Pricing

Target: sell at or near cost to maximize adoption.

**Need to determine:**
- BOM cost per unit
- Acceptable margin (if any)
- Volume breakpoints

---

## Subscription Tiers

### Free Tier (Trial)
- 30 days from activation
- Limited prompts (3-5?)
- Full feature access otherwise
- Goal: let users build their ideal UI before paywall

### Monthly Subscription
- Unlimited prompts
- Priority generation queue?
- Price range to explore: £3-8/month

### "Buy Forever"
- One-time payment
- ~1 prompt/month included
- Likely 12-24x monthly price
- Appeals to: privacy-conscious, subscription-fatigued buyers

### Credit Packs
- Buy blocks of prompts (e.g. 10, 25, 50)
- No expiry
- Pay-as-you-go, no commitment
- Appeals to: infrequent tweakers, one-and-done users

**Pros:**
- Aligns cost with actual usage
- No "paying for nothing" feeling
- Simpler to understand than subscription

**Cons:**
- Less predictable revenue
- Users may hoard credits, reduce engagement
- Pricing per credit needs to cover API cost + margin

---

## Key Tensions

| Subscription | One-time | Credits |
|--------------|----------|---------|
| Predictable MRR | No churn risk | Aligns with usage |
| Funds ongoing costs | Simpler value prop | No commitment |
| May feel like a tax | Limited prompts | Unpredictable revenue |

---

## Hardware Margin vs. Prompt Revenue

A key dependency: if users are one-and-done (or close to it), hardware must carry a viable margin on its own.

**However:** the HA audience skews toward tinkerers. These users:
- Iterate on their setup constantly
- Enjoy optimizing and customizing
- May prompt frequently, especially as their home evolves

Not a given, but a reasonable bet that prompt usage will be higher than average consumer behavior.

**Implication:** can likely pursue low-margin hardware if prompt revenue materializes — but validate this assumption early.

---

## Open Questions

1. **What does a prompt actually cost us?**
   - v0 API pricing per generation
   - This sets the floor for subscription pricing

2. **How often do users actually want to change their UI?**
   - If rarely → subscription feels like a tax
   - If often → subscription feels fair
   - HA tinkerer profile suggests "often" — but test this

3. **What's the competitive landscape?**
   - Are there similar products with established pricing?
   - What do HA users currently pay for dashboards?

4. **Trial conversion assumptions**
   - What % convert after trial?
   - Does prompt limit affect this?

---

## Recommendation

### Lead with credits, offer subscription as upgrade

**Why this fits the HA audience:**
- Local-first ethos — subscriptions for home hardware feel extractive
- Subscription fatigue — tech-savvy users are tired of paying monthly for everything
- Fairness — pay for what you use, nothing more
- Tinkerer-friendly — credits don't punish infrequent use

### Proposed structure

| Component | Detail |
|-----------|--------|
| Hardware | Small margin (10-20%), not at-cost |
| Bundled credits | 5-10 with purchase — covers initial setup |
| Credit packs | 10 / 25 / 50, no expiry, volume discount |
| Subscription (optional) | £4-6/month unlimited — for power users only |

### Rationale

1. **Hardware margin protects downside**
   - If users prompt less than expected, you're not underwater
   - Still price-competitive vs. tablets + cases

2. **Bundled credits reduce friction**
   - User can fully set up their UI before paying more
   - No paywall before value is delivered

3. **Credits feel fair to this audience**
   - HA users are used to one-time purchases
   - They'll resent a subscription for something sitting on their wall
   - "I'll buy 10 more prompts when I need them" is a comfortable mental model

4. **Subscription captures power users**
   - Some users *will* want unlimited
   - Lower price than typical SaaS (it's a peripheral, not primary software)
   - Optional, not required — removes pressure

### Pricing sketch (pending API cost data)

| Item | Price | Notes |
|------|-------|-------|
| Hardware | £80-120 | With 10 credits included |
| 10 credits | £8 | £0.80/prompt |
| 25 credits | £15 | £0.60/prompt |
| 50 credits | £25 | £0.50/prompt |
| Subscription | £5/month | Unlimited |

*Assumes ~£0.20-0.30 API cost per prompt. Adjust once v0 pricing confirmed.*


