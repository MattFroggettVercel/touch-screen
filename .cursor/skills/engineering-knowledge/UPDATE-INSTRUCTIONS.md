# How to Update the Engineering Knowledge Skill

This document explains how to keep the engineering knowledge skill up-to-date as the product evolves.

## Quick Update (Recommended)

Paste this prompt into a Cursor chat:

```
Read the engineering knowledge skill at .cursor/skills/engineering-knowledge/ (SKILL.md and architecture.md), then explore the current codebase thoroughly to identify any drift. Update both files to reflect the current state of the codebase. Keep the same structure and formatting. Keep SKILL.md under 500 lines. Don't remove information unless it's genuinely no longer accurate.
```

## Targeted Update After a Specific Change

If you've just made a significant architectural change, use a more targeted prompt:

```
I just [describe what changed, e.g. "migrated from Fastify to Hono in device-agent" or "added a new 'admin' package"]. Update the engineering knowledge skill at .cursor/skills/engineering-knowledge/ to reflect this change.
```

## When to Update

Update the skill when any of these happen:

- **New package/app added** to the monorepo
- **Framework or major dependency changed** (e.g. Next.js version bump, new ORM)
- **API routes added or restructured** in cloud app or device-agent
- **New dashboard components or patterns** introduced
- **Deployment process changed** (new CI/CD, new hosting, new Pi setup)
- **Auth, payments, or infrastructure changes**
- **Dev workflow changes** (new scripts, new TUI commands, new services)
- **Environment variables added or renamed**

You do NOT need to update for:
- Bug fixes that don't change architecture
- New pages/screens that follow existing patterns
- CSS/styling tweaks
- Content changes

## File Roles

| File | Role | Size Target |
|------|------|-------------|
| `SKILL.md` | Essential quick-reference that agents always read | Under 500 lines |
| `architecture.md` | Detailed reference read on-demand for deep dives | No hard limit, keep relevant |
| `UPDATE-INSTRUCTIONS.md` | This file — how to maintain the skill | Keep stable |

## What Goes Where

### SKILL.md (always loaded)
- System boundary map (the ASCII diagram)
- The four packages table (name, path, framework, purpose)
- Core data flow summary
- Technology choices table
- API route tables (device-agent + cloud)
- Dashboard architecture essentials (protected files, component pattern)
- Dev setup summary
- Deployment summary
- File conventions
- Environment variables

### architecture.md (loaded on demand)
- Detailed directory trees for each package
- AI chat flow internals
- AI tool definitions
- Database schema details
- Component patterns with code examples
- Tailwind theme specifics
- Config file formats
- Service internals (HA connection, Vite manager, etc.)
- Dev orchestrator details
- Pi filesystem layout
- Full dependency lists per package

## Validation Checklist

After updating, verify:

- [ ] SKILL.md is under 500 lines
- [ ] ASCII system boundary diagram is still accurate
- [ ] All four packages are listed with correct frameworks/versions
- [ ] API route tables match actual routes
- [ ] Protected files list is current
- [ ] Environment variables are complete
- [ ] Deployment instructions match reality
- [ ] No stale references to removed packages, files, or APIs
- [ ] architecture.md directory trees reflect actual structure
- [ ] Dependency lists are current
