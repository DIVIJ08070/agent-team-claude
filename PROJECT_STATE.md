# PROJECT_STATE

> Maintained by the 📝 Scribe agent. Hard cap: 100 lines. Any agent (or a fresh
> session) reads this first to get current. Details live in
> `features/<name>/MAPPING.md` — this file holds pointers, not copies.

## Project

Node/TS ephemeral security scanner: upload `.zip` → auto-detect framework/stack
→ hybrid scan (Semgrep/OSV/gitleaks/Trivy/npm-audit/pip-audit + local Claude
Code CLI) → in-app findings report + downloadable remediation guide.
JS/TS+Python, localhost-only, no DB, all scanners static/read-only.

## Current phase

- **security-scanner** (IN_PROGRESS, mid-build) — T1 (DESIGN) + T2 (BACKEND
  foundation) complete; T3 in FIX cycle (2 defects); T4 (detection) QA_PASSED;
  T5 (scanner+normalization) building; T6–T8 blocked on dependencies.

## Task snapshot

**security-scanner** — 8 tasks (1 DESIGN, 6 BACKEND, 1 UI):
- QA_PASSED/DONE: 3 (T1, T2, T4) | IN_PROGRESS: 2 (T3 fixing, T5 building)
- TODO: 3 (T6, T7, T8 awaiting deps)
- Critical path: T2✅ → T4✅ → T5 (in-flight) → T6 → T7 (blocked). T1✅ parallel.

## Decisions

- 2026-07-04 — Repo initialized with agent-team system (5 skills, 6 agents,
  /feature-dev, Telegram).
- 2026-07-04 — security-scanner: subprocess via MINIMAL_ENV (no API keys),
  scanners invoked statically/offline/read-only, Claude CLI optional (graceful
  skip if missing), zod validation on external data.
- 2026-07-05 — Design spec BUG-001 (dark-theme contrast) fixed & verified;
  core sandbox + detection layers proven sound (zero-execution audited);
  dependency-hygiene advisory (@fastify/static moderate) queued for pre-ship.

## Known bugs

- BUG-002 (T3, MED): CRC-32 mismatch not detected; contradicts §11.2 spec.
- BUG-003 (T3, LOW): Over-long entry name → 500 (INTERNAL) instead of 4xx.

## Next

1. **T3 FIX** (developer): CRC check in `extractZip.ts` (BUG-002) + name-length
   guard in `pathGuard.ts` (BUG-003); resubmit to QA (target: QA_PASSED).
2. **T5 in-flight** (developer): complete scanner adapters + normalization +
   local Semgrep rules; unblocks T6 (Claude CLI).
3. **T7 pipeline** (awaiting T3 QA_PASSED + T5 done + T6): end-to-end route
   assembly + remediation `.md` generation; unblocks T8 (UI).
