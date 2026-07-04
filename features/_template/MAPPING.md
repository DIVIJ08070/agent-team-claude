# MAPPING — <feature-name>

> **This file is the communication bus for this feature.** Every agent reads its
> context from here and writes its results back here. Chat memory is NOT the
> source of truth — this file is. Agents must update their sections immediately
> after finishing (or failing) a step, before doing anything else.

## Meta

| Field | Value |
|---|---|
| Feature | <feature-name> |
| PRD / context source | <path or inline summary> |
| Design source (Figma) | <url or "none"> |
| Spec | features/<feature-name>/SPEC.md |
| Created | <date> |
| Feature status | `PLANNING` |

Feature status values: `PLANNING` → `IN_PROGRESS` → `COMPLETE` (or `ESCALATED` while blocked on the human).

## Task Board

> Owner is one of: `manager`, `designer`, `developer`, `qa`.
> Type is one of: `DESIGN` (Figma/spec work), `UI` (frontend implementation), `BACKEND` (server/API/data implementation).
> Status flow: `TODO` → `IN_PROGRESS` → `READY_FOR_QA` → `QA_PASSED` → `DONE`
> (`QA_FAILED` sends it back to `IN_PROGRESS` with a bug reference; `BLOCKED`/`ESCALATED` pause it.)
> QA cycles counts completed dev↔QA round-trips for the task. At 3, the manager must escalate — no exceptions.

| ID | Type | Title | Owner | Status | Depends on | QA cycles |
|---|---|---|---|---|---|---|
| T1 | DESIGN | <title> | designer | TODO | — | 0 |
| T2 | UI | <title> | developer | TODO | T1 | 0 |
| T3 | BACKEND | <title> | developer | TODO | — | 0 |

## Design Handoff

> The designer fills this in when a DESIGN task completes. The developer implements
> from this section — not from chat.

- Design spec: `features/<feature-name>/DESIGN_SPEC.md`
- Figma frames referenced: <frame links / node ids, or "no Figma — spec-only">
- Design tokens: <colors, spacing, typography — or pointer into DESIGN_SPEC.md>
- Notes for developer: <gotchas, responsive rules, states>

## QA Verdicts

> QA appends one row per task verdict. Evidence is a path (screenshots dir, test
> output file) — a verdict without evidence is invalid.

| Task | Mode | Verdict | Evidence | Notes |
|---|---|---|---|---|
| — | UI / BACKEND | PASS / FAIL | features/<feature-name>/qa/... | — |

## Bugs

> QA files bugs here. The developer/designer marks them `FIXED` (with commit ref);
> only QA may move them to `VERIFIED`.

| ID | Task | Severity | Description | Status | Found by | Fixed in |
|---|---|---|---|---|---|---|
| BUG-001 | — | HIGH / MED / LOW | — | OPEN / FIXED / VERIFIED / WONTFIX | qa | <commit> |

## Escalations

> Anything that needs the human. The manager writes these and pings Telegram.

| ID | Raised by | Question / blocker | Human decision |
|---|---|---|---|
| ESC-001 | — | — | *(pending)* |

## Agent Log (append-only)

> One line per meaningful action. Never edit or delete previous entries.
> Format: `- [<agent>] <what happened / what's next>`

- [manager] Mapping file created.

## Final Summary

> Written by the manager ONLY after every task on the board is `QA_PASSED`/`DONE`.
> Until then this section must say exactly: *(pending — not all tasks passed QA)*

*(pending — not all tasks passed QA)*
