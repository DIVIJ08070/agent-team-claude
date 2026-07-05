# UI QA — T8 RE-VERIFY (BUG-005, QA cycle 1) · Verdict: **PASS**

- **Mode:** UI (qa-ui-skills), re-verification of the CSS-only fix for **BUG-005**.
- **Fix under test:** commit `286eb48`, `app/web/src/app.css` (2 rules):
  `.table-wrap` `overflow: hidden` → `overflow-x: auto; overflow-y: hidden`;
  `.findings-table th` `top: 101px` → `top: 0`.
- **App:** `app/`, built fresh (`npm run build` → exit 0, tsc + vite, 48 modules) and served `PORT=5199 npm start` (tsx `server/index.ts`, binds 127.0.0.1, serves `web/dist` + `/api` same-origin). An orphaned prior-session server on :5205 was killed so all traffic hit my :5199 instance only.
- **Design source:** no Figma → compared against `features/security-scanner/DESIGN_SPEC.md` §5.6 + SPEC §10 (fallback path, same as cycle 1).
- **Host tools (live `/api/tools`):** semgrep 1.168.0, osv-scanner 2.4.0, gitleaks 8.30.1 (all 3 required), npm-audit 11.4.2, claude 2.1.201 all available; trivy + pip-audit not installed. **Non-degraded** for the required set.
- **Playwright:** 1.61.1 (npx cache) / chromium-1228. Drove the REAL backend end-to-end: upload `samples/vulnerable-app.zip` → real scan → **18 real findings (5C/4H/8M/1L, degraded=false)** → report view → resized/re-themed within one live report session for deterministic geometry.
- **Evidence:** `features/security-scanner/qa/screenshots-T8-reverify/` (8 shots) + DOM-geometry probe (JSON below) + raw scan JSON (`scratchpad/scan-reverify.json`, host-path/sentinel grep).

## Verdict: PASS — BUG-005 fixed; no regression

The findings-table column header now sits **flush directly above the first data row** with a measured **0 px** offset (was the +101 px displacement) at every relevant breakpoint and in both themes. No new horizontal-page-scroll regression; all responsive collapses that passed cycle 1 still hold. Bonus data-quality checks (BUG-006/007) also come back clean, but those are gated by the separate T5 QA pass, not this one.

## 1) BUG-005 fix — VERIFIED

DOM geometry (bounding rects, scroll-0), compared against the cycle-1 bug signature `thead static@383 / th sticky rendered@484 = 383+101 / row0@427`:

| Breakpoint / theme | mode | th vs thead offset | th top | row0 top | header flush above row1? | th `top` (css) |
|---|---|---|---|---|---|---|
| 1280 light | table | **0** (was 101) | 383 | 427 | yes (gap 0) | 0px |
| 1280 dark | table | **0** | 383 | 427 | yes (gap 0) | 0px |
| 768 light | table | **0** | 409 | 453 | yes (gap 0) | 0px |
| 768 dark | table | **0** | 409 | 453 | yes (gap 0) | 0px |
| 375 light | **cards** (`.table-wrap` display:none) | n/a | — | — | n/a (no table header) | — |
| 375 dark | **cards** | n/a | — | — | n/a | — |

- At 1280/768 the sticky `th` now renders at the **same top as the static `thead`** (offset 0, not +101) and its bottom equals row-0's top (`gapHeaderToRow0 = 0`) → header is directly above row 1 with **no empty ~101px band**. Confirmed visually in `report-1280-light.png`, `report-1280-dark.png`, `report-768-light.png`, `report-768-dark.png`.
- At 375 the table is replaced by stacked cards (`hasTable=false`, `.table-wrap` `display:none`, 18 rows as cards) with a mobile Sort control — there is no column header to displace. `report-375-light.png`, `report-375-dark.png`.
- **Scroll behavior** (`report-scrolled-1280-light.png`, page scrolled to y=250): the header moved up **with** the table (thead 383→133) and stayed flush above row 1 (offset stays **0**, `headerAboveRow0=true`). It no longer pins under the toolbar — with `overflow-y:hidden` the wrapper is the vertical scroll root but never scrolls internally, so on page scroll the whole table (header included) translates together. **No displacement at rest OR on scroll.** Per the re-verify brief ("if a sticky header is retained, confirm it behaves correctly on scroll; either way no displacement at rest") this is acceptable. See Observation below.

## 2) No regression

- **No horizontal PAGE scroll at any breakpoint / theme:** `document.documentElement.scrollWidth == clientWidth == innerWidth` at 375 (375/375/375), 768 (768/768/768), 1280 (1280/1280/1280), both light and dark → `horizontalOverflow=false` everywhere.
- **Wide-table overflow contained in the card, not the page:** `.table-wrap` computed `overflow-x:auto; overflow-y:hidden` (as shipped). At 1280 (`wrapScrollWidth 1134 == wrapClientWidth 1134`) and 768 (`718==718`) the current table fits, so no scrollbar shows; the `overflow-x:auto` mechanism is now on the wrapper so any wider table scrolls **inside the card** while the page stays at `scrollWidth==clientWidth`. Confirmed the vertical scroll root stayed on the page (that is what makes `th{top:0}` sit flush).
- **Responsive collapses (all still hold):**
  - table→stacked cards **<640**: cards at 375 (both themes). ✅
  - Category column drops **<1024**: at 768 the table shows SEVERITY/TITLE/LOCATION/TOOL and Category renders inline under the title (`report-768-light.png`). ✅
  - drawer right-sheet **≥768**: drawer opened as a right sheet at 1280 (`drawer-1280-light.png`). ✅ (bottom-sheet <768 verified cycle 1; drawer CSS untouched by this fix.)
- **Fix scope is CSS-only, 2 rules** on `.table-wrap` + `.findings-table th` (no per-theme/token/server code touched), so everything else that passed cycle 1 (Upload 2-col + engine panel, Scanning 5-phase stepper + §4.8 error mapping, Report header/chips/context/filters/sortable table/empty/degraded/truncated, dark-theme BUG-001 CTA fix, a11y, security-visual invariants) is unaffected — the report renders identically to cycle 1 minus the header defect.

## 3) Bonus — BUG-006 / BUG-007 sanity (NOT gating T8; owned by the separate T5 QA)

Since the T5 data fix (`ac91d6b`) also landed, the drawer/report data is clean:
- Raw scan JSON (18 findings): **no `/Users/` path, no `divijpatel`, no `agent-team`** anywhere (BUG-006 host-path leak gone); **no `"requires login"` sentinel** anywhere (BUG-007 gone).
- Semgrep SAST findings now carry **clean rule ids** (`js-child-process-command-injection`, `js-dangerous-eval`, `js-hardcoded-secret`) and **real vulnerable code** in `codeSnippet` (e.g. `js-dangerous-eval` → `const result = eval(...)`; command-injection → the `app.get("/ping"…)` shell-concat lines). The semgrep **secret** finding keeps `codeSnippet` null (credential never surfaced) — correct.
- Drawer render (`drawer-1280-light.png`, the Stripe secret finding): clean location `vulnerable-app/config/secrets.env:5`, `rule: stripe-access-token`, "value is redacted", CWE reference link — looks right, no host path, no sentinel.
- These confirm the drawer "looks right"; the formal BUG-006/007 verdict belongs to the T5 QA pass.

## Observation (not a bug, non-gating)
The header is now effectively non-pinning: on scroll it translates with the table rather than pinning under the toolbar (a trade the `overflow-y:hidden` fix makes to keep the page as the vertical scroll root). DESIGN_SPEC §5.6 describes a header "pinned under the toolbar" as the ideal, so a future enhancement could restore pin-on-scroll (e.g. make the whole report a fixed-height scroll region, or use a JS-driven sticky). This is a standard, acceptable table pattern and the re-verify brief explicitly does not gate on it ("either way no displacement at rest"). Flagged for the manager as a potential polish item, not filed as a bug.

## Raw DOM-geometry probe (excerpt)
```
1280 light  th{top:0px} theadTop=383 thTop=383 thBottom=427 row0Top=427 offset=0 gap=0 hOverflow=false
1280 dark   th{top:0px} theadTop=383 thTop=383 thBottom=427 row0Top=427 offset=0 gap=0 hOverflow=false
768  light  th{top:0px} theadTop=409 thTop=409 thBottom=453 row0Top=453 offset=0 gap=0 hOverflow=false
768  dark   th{top:0px} theadTop=409 thTop=409 thBottom=453 row0Top=453 offset=0 gap=0 hOverflow=false
375  light  cards mode (table-wrap display:none), 18 rows as cards, hOverflow=false
375  dark   cards mode, hOverflow=false
scroll y=250 (1280 light): thead 383→133, offset stays 0, headerAboveRow0=true (scrolls with table, no displacement)
raw scan JSON: contains '/Users/'=false  'divijpatel'=false  'requires login'=false  findings=18
```
