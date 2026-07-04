---
name: qa-ui-skills
description: QA mode for UI tasks — run the app, capture Playwright screenshots at 375/768/1280 plus interaction states, compare against Figma (via Figma MCP) or the design spec, run a11y checks, and write an evidence-backed verdict into MAPPING.md.
user-invocable: false
---

# QA Skills — UI Mode

Use this mode when the task's **Type is `UI`** (or DESIGN specs need visual
verification). Your job: prove the implemented UI matches the design source and
the PRD's UI requirements — with screenshot evidence, not opinions.

## Workflow

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
     bash .claude/scripts/telegram.sh qa "🧪 <feature>/T<id> UI: ❌ FAIL — 2 bugs filed (BUG-003, BUG-004)"
     ```

## Rules

- **A verdict without evidence files is invalid.** No screenshots → no verdict.
- Judge against the design source and PRD — not against what the developer says
  the app does, and never against your own aesthetic preferences.
- Small anti-aliasing/font-rendering deltas are not bugs; wrong hex values,
  wrong spacing (>2px off spec), missing states, and broken interactions are.
- When re-verifying a `FIXED` bug: re-run the same capture for that state; only
  then move the bug to `VERIFIED`. You verify fixes — the developer never does.
