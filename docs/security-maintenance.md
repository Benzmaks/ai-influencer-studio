# Phase 5 dependency security maintenance

## Scope and fixes (2026-11-02)

The reported 19 findings were dependency-path entries for two advisories, not
19 independent vulnerabilities:

- `deepmerge-ts <8.0.0`: recursive merge stack exhaustion,
  [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx).
  Three high entries through Prisma/config, also reported with dev dependencies omitted.
- `minimatch <11.0.1`: glob-part amplification denial of service,
  [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249).
  Sixteen moderate entries through development lint tooling.

Exact npm overrides install official integrity-locked `deepmerge-ts@8.0.0` and
`minimatch@11.0.1`. Full and production-only npm audits now report zero findings.
No audit exclusions, severity suppression, fake package versions or
`npm audit fix --force` are used. This result covers published npm advisories at
the time checked; it is not a guarantee against future or undisclosed issues.

## Compatibility decisions

Keep Prisma client, adapter and CLI aligned at 6.19.3. A Prisma 7 upgrade would
introduce unrelated configuration/runtime changes. These are explicitly tested
transitive major overrides outside the parent packages' declared ranges; they
are a temporary compatibility measure, not an upstream-certified combination.
The existing native/classic migration strategy and every migration SQL file
remain unchanged. Nothing resets user databases, credentials or asset files.

The existing React/import/accessibility lint plugins expect minimatch's old
callable CommonJS export. `scripts/prepare-lint-compat.mjs`, run by npm
postinstall, adds that export shape to the official patched v11 implementation.
It also changes the import plugin's `no-internal-modules` rule from removed
`makeRe().test()` calls to `new Minimatch().match()`. This keeps matching in
the patched engine rather than restoring vulnerable legacy regex code.
ES module exports, matching algorithms and security limits are not patched.

Both transformations verify exact upstream SHA-256 source hashes before
changing installed files and are idempotent. Unexpected package contents stop
installation for review. No application lint rule is removed or disabled.
Development-package omissions skip the lint-only preparation; normal setup must
allow npm lifecycle scripts. After an intentional `npm ci --ignore-scripts`, run
`node scripts/prepare-lint-compat.mjs` before lint/tests (and regenerate Prisma).
Tests exercise fresh/repeated patching, changed-file rejection, cyclic merge
handling and actual React, accessibility and import rule diagnostics.

ESLint 9's existing end-of-support notice is separate from the fixed advisories.
Retain its current version for this narrow repair: an ESLint 10 upgrade requires
coordinating plugin peer compatibility and does not itself remove minimatch's
advisory. Review upstream releases and remove the bridge/overrides once all
parents support patched dependencies directly.

## Verification and release gate

`npm run audit:dependencies` fails on moderate or higher advisories, including
registry/network errors; CI never treats an unavailable audit as a clean result.
CI runs the complete native migration, authorization, worker recovery, build,
production authentication and desktop/mobile browser workflow on Node 24.19.0
and the Monterey preview runtime version, Node 22.23.4. The application's primary
engine declaration remains Node 24; the Mac launcher deliberately allows the
separately tested Node 22 preview. Its existing engine warning is not a new
vulnerability or an invitation to replace Monterey's compatible runtime.

Security implementation: `10983b0d71eac84394fe1f6e2e6bbae4fb4e7682`.
Hosted native CI **passed both complete matrix jobs**, Node 24.19.0 and 22.23.4:
[push run 41435249687](https://github.com/Benzmaks/ai-influencer-studio/actions/runs/41435249687)
(6m 14s), and
[PR run 41435266463](https://github.com/Benzmaks/ai-influencer-studio/actions/runs/41435266463)
(6m 15s). Each runs locked install/audit, native fresh and repeated migrations,
repeatable seed, populated migration preservation checks, lint/types/format,
61 unit tests, 36 integration/authorization/recovery tests, production build and
authentication guards, and all 20 desktop/mobile browser tests. The hosted runs
use the original committed browser timeouts; no assertions are skipped.

Local checks passed: clean locked installation with postinstall; full and
production-only audits (zero findings); Prisma client generation; 61/61 unit
tests on Node 24 and again on Node 22; lint, types, formatting; production build
and authentication guards; infrastructure health; unchanged migration bytes;
Mac updater Bash syntax, ZIP byte integrity and published source contents.
The lint-only installer also exits successfully when development dependencies
are absent.

Local failures are recorded separately: the experimental adapter integration
run passed 35/36 with the known repeated-disconnect timeout; the WASM migration
check failed deserializing PostgreSQL catalog type `name`. The first browser
run passed 17/20, with three five-second login/character/gallery wait timeouts.
Both native hosted matrix jobs passed the complete checks with their original
settings, independently of these cloud-only limitations. See
[phase-5-validation.md](phase-5-validation.md) for the existing engine restriction.
Physical Monterey execution of the refreshed updater and backup restoration are
unavailable here. No paid/real provider tests apply; none were connected. No
test is silently skipped to obtain the hosted result. No next-phase work is included.

## Install on the existing private Mac

The Phase 5 updater ZIP is repinned to the tested security implementation.
Download a fresh copy after this update, extract it into Downloads, then run:

```bash
/bin/bash "$HOME/Downloads/Phase 5 Preview/Preview Phase 5.command"
```

It takes a private backup, installs the locked dependencies and retains the
existing login, projects, characters, scenes and image history. The browser
remains at http://localhost:3000. Merely merging GitHub does not update the Mac.
