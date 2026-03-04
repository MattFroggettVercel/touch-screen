# How to Update the Product Knowledge Skill

This document explains how to keep the product knowledge skill up-to-date as the product evolves.

## Quick Update (Recommended)

Paste this prompt into a Cursor chat:

```
Read the product knowledge skill at .cursor/skills/product-knowledge/ (SKILL.md and product-details.md), then explore the current codebase from a product perspective — user-facing pages, mobile screens, checkout flows, credit system, marketing copy, setup flows, system prompts, and docs/. Update both files to reflect the current state of the product. Keep the same structure and formatting. Keep SKILL.md under 500 lines. Don't remove information unless it's genuinely no longer accurate.
```

## Targeted Update After a Specific Change

If you've just made a specific product change, use a targeted prompt:

```
I just [describe what changed, e.g. "added credit pack purchasing" or "launched the Explore tab with community templates"]. Update the product knowledge skill at .cursor/skills/product-knowledge/ to reflect this change.
```

## When to Update

Update the skill when any of these happen:

- **New user-facing feature** launched (new screens, new flows)
- **Pricing or business model changed** (new credit packs, subscription, price changes)
- **User journey changed** (new onboarding steps, changed setup flow)
- **New entity types or cards** added to the dashboard
- **Marketing copy or positioning changed**
- **Auth methods added or removed**
- **New product variant** (colours, form factors)
- **Checkout flow changed**
- **Demo experience changed**
- **New platform support** (beyond Home Assistant)
- **Product terminology changed**

You do NOT need to update for:
- Bug fixes that don't change the user experience
- Internal refactors invisible to users
- Performance improvements
- Dev tooling changes

## File Roles

| File | Role | Size Target |
|------|------|-------------|
| `SKILL.md` | Essential product context that agents always read | Under 500 lines |
| `product-details.md` | Detailed reference read on-demand for deep dives | No hard limit, keep relevant |
| `UPDATE-INSTRUCTIONS.md` | This file — how to maintain the skill | Keep stable |

## What Goes Where

### SKILL.md (always loaded)
- Product summary and tagline
- Target user description
- Product variants and pricing
- Business model
- Terminology glossary
- User journeys (purchase, setup, editing, demo)
- Feature map (web, mobile, device)
- Dashboard capabilities and supported cards
- AI interaction model (from user's perspective)
- Competitive position
- Product constraints
- Key product file paths

### product-details.md (loaded on demand)
- Full screen inventories (mobile + web)
- Credit system internals
- Checkout flow step-by-step
- Auth flow details
- Device registration flow
- Demo technical details
- Marketing page sections and copy themes
- Product roadmap signals
- Hardware specs

## Validation Checklist

After updating, verify:

- [ ] SKILL.md is under 500 lines
- [ ] Pricing is current
- [ ] All product variants listed
- [ ] User journeys match actual flows
- [ ] Feature map covers all user-facing features
- [ ] Supported entity cards list is complete
- [ ] Terminology glossary is consistent with UI copy
- [ ] Product constraints reflect reality (e.g. if credit packs are now live, remove that constraint)
- [ ] Competitive positioning is current
- [ ] Screen inventories in product-details.md match actual routes
- [ ] Credit system details match implementation
- [ ] Key file paths are still valid
