# UI QA — T8 (Frontend SPA) · Verdict: **FAIL**

- **Mode:** UI (qa-ui-skills). **Commit:** d1cdcfb. **App:** `app/`, built (`npm run build` → exit 0), served `PORT=5199 npm start` (tsx server/index.ts, binds 127.0.0.1, serves web/dist + /api same-origin).
- **Design source:** no Figma → compared against `features/security-scanner/DESIGN_SPEC.md` + SPEC §10 (fallback path).
- **Host tools (live `/api/tools`):** semgrep 1.168.0, osv-scanner 2.4.0, gitleaks 8.30.1 (all 3 required), npm-audit 11.4.2, claude 2.1.201 all available; trivy + pip-audit not installed. Non-degraded for the required set.
- **Evidence:** `features/security-scanner/qa/screenshots-T8/` (35 screenshots at 375/768/1280 + states, light+dark) + this file.
- **Playwright:** 1.61.1 (npx cache), chromium-1228. Drove the REAL backend end-to-end (upload → real scan → 18 real findings → report → report.md download) plus route-mocked deterministic states (scanning phases, §4.8 errors, AI tags, empty, degraded/truncated, engine-status).

## Verdict: FAIL — 1 UI layout defect (BUG-005) blocks; 2 backend data defects surfaced (BUG-006/007 → route to T5)

The SPA is high-fidelity against DESIGN_SPEC across nearly every screen/state/theme/breakpoint and all functional + a11y + security-visual checks pass. It FAILS on one prominent, first-view layout defect on the primary surface (the findings-table column header is displaced into the data rows). Two backend data-quality defects were also discovered through the UI (the frontend renders them faithfully; root cause is upstream in the scanner/normalize layer).

## Bugs filed

### BUG-005 (MED · T8 UI) — FindingsTable sticky column header displaced ~101px down into the data rows
On the Report view at **scroll 0, normal viewport (reproduced at 1280 AND 768)**, the column header row (SEVERITY/TITLE/LOCATION/TOOL/CATEGORY) renders **below the first data row**, with an empty 44px band where the header should sit; the header also does not pin under the toolbar on scroll.
- **Root cause (DOM-measured):** `.findings-table th { position: sticky; top: 101px }` (`app.css:974`) inside `.table-wrap { overflow: hidden }` (`app.css:960`, used to clip the rounded corners). `overflow:hidden` makes `.table-wrap` the sticky scroll container; it never scrolls (height auto, fits all rows), so the sticky `th` pins **101px below the wrapper top** instead of at the table top / under the toolbar. Measured: `thead` static top 383 (empty band); `th` sticky rendered top **484 = 383 + 101**; `tbody`/row0 top 427.
- **Impact:** the app's core surface looks broken on first load; contradicts DESIGN_SPEC §5.6 (sticky header pinned under the toolbar).
- **Fix direction:** don't put `overflow:hidden` on the sticky scroll ancestor — clip corners on the table itself / use `overflow:clip` won't help; make the `thead`/`th` sticky relative to the page (remove the wrapper's overflow, or drop the sticky and accept a non-sticky header). T8 CSS-only.
- **Evidence:** `06-report-REAL-1280-light.png`, `30-report-viewport-top-1280.png` (non-fullPage, scroll 0), `12-report-REAL-768-light.png`, `32-report-keyboard-focus-ring-1280.png` + DOM geometry probe.

### BUG-006 (MED · route to T5 normalize/semgrep) — semgrep ruleId leaks the absolute HOST PATH
Every semgrep finding's `ruleId` = `Users.divijpatel.Desktop.agent-team.app.rules.javascript.js-<rule>` — the absolute host path (`/Users/divijpatel/Desktop/agent-team/app/rules/javascript`) with `/`→`.`. Surfaced in the FindingDetail "rule:" line AND the downloadable `report.md`.
- **Root cause:** semgrep derives `check_id` from the `--config <absolute-path>`; the normalizer passes it through unstripped (confirmed by a direct `semgrep --config <abspath> --json` run → same `check_id`). Violates the SPEC "never surface host paths" invariant (leaks username `divijpatel` + directory structure into a shareable report).
- **The UI is NOT at fault** — it renders the string as inert text (React auto-escape), no injection. Data-source defect.
- **Fix direction:** strip the config-path prefix from the ruleId (keep only the trailing rule id) during normalization, or invoke semgrep with a `--config` path relative to cwd.
- **Evidence:** `08-drawer-REAL-rightsheet-1280.png`, `13-drawer-REAL-375.png` (rule: line) + `_report-download.md` + raw `scan-result.json`.

### BUG-007 (MED · route to T5 semgrep adapter) — every SAST codeSnippet is the sentinel "requires login", not the real code
All 3 semgrep findings (js-dangerous-eval, js-child-process-command-injection, js-hardcoded-secret) show `codeSnippet: "requires login"` in the drawer CODE block instead of the actual vulnerable line (e.g. line 26 is `const result = eval(expr);`).
- **Root cause:** semgrep 1.168.0 redacts `extra.lines` to the literal `"requires login"` unless authenticated to Semgrep Cloud; `server/scanners/semgrep.ts:88` (`const snippet = r.extra?.lines?.trim()`) trusts it. Reproduced with a direct semgrep run (no `SEMGREP_APP_TOKEN`) → `extra.lines: "requires login"`. "requires login" does not appear anywhere in the fixture.
- **Impact:** misleading for a security tool — SAST findings show a login sentinel as their "evidence" code. The UI renders it correctly (escaped/fenced); data-source defect.
- **Fix direction:** detect the `"requires login"` sentinel and fall back to reading the actual line(s) from the extracted read-only file, or null the snippet, or authenticate semgrep.
- **Evidence:** `08-drawer-REAL-rightsheet-1280.png` (CODE = "requires login") + raw findings dump.

## Judged deviations — ACCEPTABLE (not bugs)
- **Mobile (375) filter toolbar wraps** (search full-width + Tool/Category dropdowns + Sort select + interactive severity chips) instead of the separate "Filters" bottom-sheet in DESIGN_SPEC §4.3.c. All filter functionality is present and usable; no horizontal scroll. Legitimate responsive pattern → acceptable (as the dev flagged).
- **Mobile engine-status panel always-expanded** (`collapsible={false}` in Upload.tsx) vs §5.9 "collapsible, collapsed by default". Fully functional, just more vertical space. LOW/cosmetic — not filed.
- **Limits footer "3m budget"** vs spec example "180s" (identical value, 180000 ms). Acceptable.

## Observation for manager (not a T8 bug)
- **Claude produced 0 enrichments / 0 new findings** on the demo dataset (claude-cli IS in `toolsRun`, mode `enrich+logic`, findingCount 0; `summary.enrichedByClaude=false`). So the AI-identified/AI-enriched tags are not exercised by real data. I exercised the **rendering paths via injected data** — both tags, numbered remediation, "N tools", and "project" location all render correctly (`22`/`23`/`24`/`26`). Since AI remediation is a core product goal, investigate why Claude returns 0 enrichments — possibly related to BUG-007 (if the model sees redacted "requires login" snippets it has no real code to reason about). Route to backend (T6/T7 prompt/context tuning).

## What PASSED (high fidelity vs DESIGN_SPEC)
- **Upload (§4.1):** 2-col layout, dropzone (empty/dragover/selected states), engine-status panel ("All systems" pill + per-scanner required tags + versions + Claude row + limits footer), scanners-only toggle, disabled Start scan until file chosen, no-scanners warning banner. `01/02/03/04/11/14/15/27/28`.
- **Scanning (§4.2/§5.5):** radar spinner, determinate progress bar + %, 5-phase stepper (done/active/pending), scanners-only → enriching "skipped — scanners-only mode", truncated warning banner, cancel, error states mapping §4.8 (retryable "Try again" vs non-retryable "Start over"). `05/18/19/20/21`.
- **Report (§4.3):** header (Download CTA, degraded + truncated banners, severity summary chips with zero-count muted, stack/tools-run/tools-skipped context strip), sticky filter toolbar (search debounced + Tool/Category multiselect + result count), sortable table (left-ellipsis mono locations), FindingDetail drawer (badge, confidence pill, category tag, copy location, WHAT'S WRONG/WHAT TO CHANGE numbered, fenced escaped CODE, references as external links, AI tags, "N tools", "project"), empty "No findings" success state (Download still enabled), degraded/truncated. `06/07/09/10/12/22/23/24/25/26`.
- **Responsive (375/768/1280):** **no horizontal page scroll at any width** (measured `scrollWidth==clientWidth` on upload/report/drawer/scanning at all 3); Category column drops at 768 (moves to Title 2nd line); table→stacked cards at 375; drawer right-sheet ≥768 / bottom-sheet 375 (drag handle, rounded top).
- **Dark theme:** complete; **BUG-001 fix verified in the shipped app** — dark Download CTA computed `#0a0d16` on `#818cf8` = **6.51:1** AA (light `#fff` on `#4f46e5` = 6.29:1), matching DESIGN_SPEC §8. `14/16/17`.
- **Security-visual:** no `dangerouslySetInnerHTML` on any API string (only `Icon.tsx` uses it with a compile-time-constant PATHS map — safe); code snippet escaped in `<pre><code>{…}</code></pre>`; null file/line guarded → "project"/"—"; the host-path-bearing ruleId rendered as inert text (no injection).
- **A11y:** real `<table>` + `th scope="col"` + `aria-sort="ascending"` on default sort; rows `role="button"`/`tabindex=0`/`aria-label`; search `aria-label`; result-count `aria-live="polite"`; drawer `role="dialog"`/`aria-modal="true"`/`aria-labelledby` + focus→Close + Esc closes + focus trap; keyboard Tab focus-visible ring `2px solid #4F46E5` (`:focus:not(:focus-visible){outline:none}` correct). `29/32`.
- **Real E2E:** upload vulnerable-app.zip → real scan → 18 real findings (5C/4H/8M/1L, degraded=false) → report → report.md download (22.4 KB, `remediation-<id>.md`).
