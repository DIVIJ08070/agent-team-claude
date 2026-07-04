---
name: qa-backend-skills
description: QA mode for BACKEND tasks — derive test cases from the PRD/spec before reading the implementation, automate and execute them, save evidence, and write the verdict into MAPPING.md.
user-invocable: false
---

# QA Skills — Backend Mode

Use this mode when the task's **Type is `BACKEND`**. Your job: prove the
implementation satisfies the PRD and SPEC.md contracts — with executed tests as
evidence.

## Cardinal rule

**Derive your test cases from the PRD and SPEC.md BEFORE reading any
implementation code.** Tests written after reading the code inherit the code's
assumptions and miss exactly the bugs that matter. Only after your test-case
list is written may you open the source (to find ports, start commands, and
wiring — not to change what you test).

## Workflow

1. **Context.** From the mapping file read your task row and the PRD + SPEC.md
   sections it covers. Log that QA has started.
2. **Write the test-case list** at `features/<feature>/qa/TEST_CASES-<task>.md`:

   | ID | Requirement | Input / action | Expected |
   |---|---|---|---|
   | TC-01 | PRD §1 shorten | POST /api/shorten {url: valid} | 200, {code: 6 chars, shortUrl} |

   Cover for every requirement: the happy path, **invalid inputs** (wrong types,
   missing fields, malformed values), **edge cases** (empty, duplicates,
   idempotency, unknown IDs → 404), **state rules** (counters increment,
   persistence across restart when the PRD demands it), and exact **status
   codes + response shapes** from SPEC.md.
3. **Automate.** Implement the cases in the project's test framework (follow
   SPEC.md; default to the stack's idiom — e.g. vitest/jest + supertest for
   Node, pytest + httpx for Python). Tests live with the app code per SPEC.md
   layout. Each test cites its TC id in its name.
4. **Execute** the full suite against a freshly started app. Save the complete
   runner output to `features/<feature>/qa/test-results-<task>.txt`. For
   restart-persistence cases, actually stop and restart the process — don't
   simulate it.
5. **Verdict.** In the mapping file:
   - Append a **QA Verdicts** row — Mode `BACKEND`, PASS/FAIL, evidence = the
     TEST_CASES file + results file, notes = `N/M cases passed`.
   - All pass → task `QA_PASSED`. Any fail → task `QA_FAILED` + one **Bugs** row
     per distinct root cause (cite the failing TC ids; severity: HIGH = wrong
     behavior/data loss, MED = wrong status code/shape, LOW = cosmetic).
   - Log it, then post:
     ```bash
     bash .claude/scripts/telegram.sh qa "🧪 <feature>/T<id> BACKEND: ✅ PASS — 14/14 test cases green"
     ```

## Rules

- **A verdict without an executed-results file is invalid.** "The code looks
  right" is not QA.
- Test the contract, not the implementation: if SPEC.md says `400 {"error":
  "invalid_url"}` and the code returns `422`, that's a bug even if the code is
  "reasonable" — contract changes go through the manager, not through QA
  quietly accepting them.
- Never fix the app's code. You may only add/modify test files. Bugs go in the
  Bugs table for the developer.
- When re-verifying a `FIXED` bug: rerun the full suite (regressions hide behind
  point fixes); only then move the bug to `VERIFIED`.
