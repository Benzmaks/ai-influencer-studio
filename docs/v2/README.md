# AI Influencer Studio V2 — Documentation index

> **Status: planning only.** These documents describe proposed V2 capabilities, not features already implemented, proven, priced or authorised. Do not begin implementing them without an explicitly approved scoped task.

## Read selectively to reduce context and token use

| Need | Read |
| --- | --- |
| Understand the product and priorities | [PRD.md](PRD.md) |
| Understand system boundaries and proposed design | [Architecture.md](Architecture.md) |
| Start a normal implementation task | [Architecture-essentials.md](Architecture-essentials.md) then the relevant source files |
| Instructions applying to files in this directory | [AGENTS.md](AGENTS.md) |
| Prepare a Codex work request / acceptance checklist | [codex.md](codex.md) |
| Apply the approved ultra-fine skin realism visual benchmark | [Ultra-Fine-Skin-Realism-DNA.md](Ultra-Fine-Skin-Realism-DNA.md) |
| Temporary scratch space | [scratchpad.md](scratchpad.md) (intentionally empty) |

**Order of authority:** explicit task request → repository/root `AGENTS.md` and other applicable instructions → approved technical decisions/source code → these draft V2 notes. If documents conflict with current code, inspect code and report the difference rather than silently inventing a migration.

## Working agreements

- V1 phases and V2 design ideas are different workstreams. Keep V2 planning changes from accidentally altering V1.
- Natural photographic realism is built into all Character DNA by default; advanced controls tune it rather than unlock baseline quality.
- Do not confuse user-funded API balances with website subscription credits, or describe mock assets as real generations.
- Keep documentation short, link to deeper details, and update only the sections impacted by an approved change.
