---
name: qa-ui-skills
description: QA modes for design-side tasks — DESIGN spec review (verify DESIGN_SPEC.md against the PRD, no app needed) and UI verification (run the app, Playwright screenshots at 375/768/1280 plus states, compare against Figma via MCP or the design spec, a11y checks) — with evidence-backed verdicts written into MAPPING.md.
user-invocable: false
---

# QA Skills — DESIGN & UI Modes

This file has two modes. Route by the task's **Type** column:
`DESIGN` → spec-review mode (below). `UI` → UI mode (further down).

## DESIGN spec-review mode

A DESIGN task is QA'd **before** any code exists — there is no app to run and
no screenshots to take. You review the artifact itself: `DESIGN_SPEC.md`.

1. **Context.** From the mapping file read your task row, the Design Handoff
   section, `DESIGN_SPEC.md`, and the PRD's UI requirements. Log that QA started.
2. **Review the spec against the PRD**, writing your findings as you go into
   `features/<feature>/qa/design-review-<task>.md`:
   - **Coverage:** every UI requirement in the PRD maps to a component/state in
     the spec — walk them one by one. Missing state (error? disabled? empty?)
     = a bug.
   - **Exactness:** every color is a hex value, every size a number, all three
     breakpoints (375/768/1280) specified. "TBD" or vague values = a bug.
   - **Contrast:** compute the contrast ratio for each text-color/background
     pair from the actual hex values; flag anything below 4.5:1 (3:1 for large
     text).
   - **Consistency:** tokens used in Layout/Components exist in the token
     table; Figma frames listed in the Design Handoff are the ones the spec
     cites.
3. **Verdict.** Append a QA Verdicts row — Mode `DESIGN`, PASS/FAIL, evidence =
   the review file. `PASS` → task `QA_PASSED`; `FAIL` → task `QA_FAILED` + one
   Bugs row per problem (these route back to the **designer**). Log it, post to
   Telegram.

## UI mode

Use this mode when the task's **Type is `UI`**. Your job: prove the implemented
UI matches the design source and the PRD's UI requirements — with screenshot
evidence, not opinions.

### Workflow

1. **Context.** From the mapping file read: your task row, the Design Handoff
   section, `DESIGN_SPEC.md`, the PRD's UI requirements, and the developer's
   Agent Log entry for how to start the app. Log that QA has started.
2. **Run the app.** Install deps and start it exactly as the developer's log
   says. If it doesn't start, that's an automatic `FAIL` — file a HIGH bug with
   the error output as evidence; do not debug it yourself.
3. **Capture screenshots with Playwright** into
   `features/<feature>/qa/screenshots/`:
   - Three viewports: **375×812, 768×1024, 1280×800** — full page.
   - Every interaction state the PRD/design spec names: default, filled,
     success, error, disabled, hover/focus where feasible (drive the page with a
     small Playwright script: fill inputs, click, then screenshot).
   - Name files `<task>-<viewport>-<state>.png`.
   - If Playwright isn't installed: `npm i -D playwright && npx playwright install chromium`.
4. **Compare against the design source:**
   - **Figma path (preferred):** if Figma MCP tools are available and the Design
     Handoff lists frames, pull each referenced frame's image/values via the MCP
     tools and compare against your screenshots: layout structure, colors
     (exact hex via computed styles, not eyeballing), typography, spacing,
     border-radius, states. Use a Playwright `evaluate` call to read computed
     styles for the key elements when precision matters.
   - **Fallback path:** no Figma MCP or no link → compare against
     `DESIGN_SPEC.md` tokens the same way. Say in your verdict which path you used.
5. **Functional UI checks.** Every UI behavior in the PRD (copy button copies,
   error shows on invalid input, button disabled when empty…) gets exercised in
   the Playwright script. A pixel-perfect page with a dead button is a `FAIL`.
6. **Accessibility pass:** labels/roles on interactive elements, keyboard
   operability of the main flow, visible focus, contrast of text colors against
   backgrounds (compute the ratio from the actual hex values; flag < 4.5:1).
7. **Verdict.** In the mapping file:
   - Append a **QA Verdicts** row — Mode `UI`, PASS/FAIL, evidence = the
     screenshots directory, notes = comparison method + deltas found.
   - `PASS` → task status `QA_PASSED`. `FAIL` → task `QA_FAILED` + one **Bugs**
     row per distinct problem (severity: HIGH = broken/wrong behavior,
     MED = visible design deviation, LOW = polish).
   - Log it, then post:
     ```bash
     bash .claude/scripts/telegram.sh qa '<feature>/T<id> UI: ❌ FAIL — 2 bugs filed (BUG-003, BUG-004)'
     ```

## Rules (both modes)

- **A verdict without evidence files is invalid.** UI mode: no screenshots → no
  verdict. DESIGN mode: no written review file → no verdict.
- Judge against the design source and PRD — not against what the developer or
  designer says, and never against your own aesthetic preferences.
- Small anti-aliasing/font-rendering deltas are not bugs; wrong hex values,
  wrong spacing (>2px off spec), missing states, and broken interactions are.
- When re-verifying a `FIXED` bug: redo the same evidence step (UI mode: re-run
  the capture for that state; DESIGN mode: re-review the amended spec section);
  only then move the bug to `VERIFIED`. You verify fixes — the author never does.
