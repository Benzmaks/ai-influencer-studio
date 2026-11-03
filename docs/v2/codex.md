# Codex — compact task brief for V2

Use this file as a **task template**, not as a standing instruction to implement V2.

## Starting protocol
1. Confirm the user explicitly authorised the specific task and branch.
2. Read root `AGENTS.md`, `docs/v2/Architecture-essentials.md`, relevant source files and tests.
3. Consult only task-relevant sections in `PRD.md` and `Architecture.md`.
4. State the existing functionality, desired change, non-goals and risks before editing.

## Paste-ready task template

**Task:** [one specific user-visible feature or defect]

**Branch/base:** [feature branch from latest main]

**Scope:** [exact routes/components/domains to change]

**Acceptance criteria:**
- [ ] [User workflow]
- [ ] [Validation / accessibility / mobile]
- [ ] [Authorization / versioning / error handling]
- [ ] [Tests, production build, migration review if relevant]

**Do not:** change other phases, connect paid providers, overwrite assets, silently modify Character DNA, invent sample data or merge without instruction.

**Completion report:** implementation summary; files changed; test and build results; honest limitations; local preview instructions; PR link.

## Short execution rules
- Simple and Advanced use identical stored DNA with defaults + explicit overrides.
- Prefer preview → compare → approve for canonical identity changes.
- Keep scene-specific makeup, glow, clothing and backgrounds separate from identity.
- Label every mock asset or simulated output as mock.
- Keep provider secrets server-side; don't promise shared website/API credits.
- Use narrow diffs; run relevant automated checks; propose a PR for review.
