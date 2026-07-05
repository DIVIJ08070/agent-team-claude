# QA DESIGN Review — T1 (UI/UX design spec)

- **Mode:** DESIGN (spec review — no app, no screenshots).
- **Artifact reviewed:** `features/security-scanner/DESIGN_SPEC.md`
- **Judged against:** `SPEC.md` §10 (three screens), §4 (API shapes incl. §4.8 error enum),
  §5 (Finding/ScanResult data model) + PRD Meta.
- **Reviewer:** QA agent · **Date:** 2026-07-04
- **Verdict:** ❌ **FAIL** — 1 must-fix defect (dark-theme primary-CTA contrast below WCAG AA).
  Everything else (coverage, exactness, light-theme contrast, consistency, responsive)
  is complete and correct.

Contrast computed with WCAG 2.1 sRGB formula:
`/private/tmp/.../scratchpad/contrast.py` (re-runnable; results inlined in §3 below).

---

## 1. Coverage — SPEC §10 / §4 / §5 walked one-by-one

### Screen 1 — Upload (SPEC §10.1) → DESIGN §4.1 + components

| SPEC requirement | Design location | OK |
|---|---|---|
| Drag-drop zone + file picker, single `.zip` | §5.3 Dropzone (drag/dragover/selected/error states, hidden `input accept=".zip"`, Browse button) | ✅ |
| Client-side pre-checks (extension, size) = UX only, server is truth | §4.1 step 2 (explicitly "UX only", server source of truth) | ✅ |
| Engine-status panel from `GET /api/tools` (scanners + Claude + limits) | §5.9 ToolStatus (scanner rows, Claude row, limits footer) | ✅ |
| Optional "scanners-only" toggle → `mode` | §5.2 Toggle (`role=switch`, sets `mode="scanners-only"`) | ✅ |
| On submit `POST /api/scan` → `scanId` → transition | §4.1 step 4 (202 → Scanning) | ✅ |

### Screen 2 — Scanning/progress (SPEC §10.2) → DESIGN §4.2 + §5.4/§5.5

| SPEC requirement | Design location | OK |
|---|---|---|
| Poll `GET /api/scan/:id` or SSE; phases extracting→detecting→scanning→enriching→assembling→done | §4.2 + §5.5 PhaseStepper (all 5 working phases mapped; `done`=transition; 1000ms poll; SSE additive) | ✅ |
| Cancel affordance (abort + temp cleanup) | §4.2 step 5 (ghost "Cancel scan", best-effort abort, toast) | ✅ |
| Surface `limits.truncated` | §4.2 step 4 truncated warning banner (carried to report) | ✅ |
| Map §4.8 error envelope → inline error | §4.2 error state + §7 full error-code map | ✅ |
| Progress `0..1`, coarse phase-derived | §5.4 ProgressBar (determinate + indeterminate fallback) | ✅ |

### Screen 3 — Report/results (SPEC §10.3) → DESIGN §4.3 + §5.6/§5.7

| SPEC requirement | Design location | OK |
|---|---|---|
| Header: detected frameworks | §4.3.a #5 Context strip "Stack" (framework→display map, primaryLanguage, empty→"generic scan") | ✅ |
| Header: tools run w/ versions | §4.3.a #5 context strip (name+version; claude-cli shows `mode`) | ✅ |
| Header: tools skipped w/ reasons | §4.3.a #5 + §7 `toolsSkipped[].reason` friendly map (all 5 reasons) | ✅ |
| Header: severity summary chips (SeverityBadge) | §4.3.a #4 + §5.10 (soft chip per severity, order critical→info, zero-count muted, `total`) | ✅ |
| Header: `degraded` banner | §4.3.a #2 + §5.8 (claude-unavailable vs required-scanner-missing copy, `notes` bullets) | ✅ |
| Findings table: severity, title, `file:line`, tool, category — sortable | §5.6 (all 5 columns, per-column sort keys, `aria-sort`) | ✅ |
| Client-side filters: severity/tool/category/free-text | §4.3.b (all four facets, OR-within/AND-across semantics, 150ms debounce) | ✅ |
| Detail drawer: description, numbered remediation, references, fenced code snippet, AI tag | §5.7 (7-part anatomy; remediation string→client-parsed `<ol>`; escaped code block; AI-identified/AI-enriched) | ✅ |
| Download remediation `.md`; disabled+tooltip when `report.available===false` | §4.3.a #1 + §5.11 tooltip | ✅ |
| Empty states: "No findings" vs "No scanners available" | §4.3.c + §6 (success empty vs NO_SCANNERS error surface; both handled) | ✅ |

### SPEC §4 API shapes consumed

- §4.1 `POST /api/scan` — `mode` full/scanners-only ✅; 202 `{scanId}` ✅; sync errors NO_FILE/NOT_A_ZIP/UPLOAD_TOO_LARGE ✅.
- §4.2 `GET /api/scan/:id` — full status enum, `progress`, `result`, `error`; 404 SESSION_NOT_FOUND handled ✅.
- §4.3 SSE `/events` — additive, UI works on polling alone ✅.
- §4.4 `POST /api/detect` — **intentionally not surfaced.** SPEC marks it "optional UI preview" and it is not in the §10 three-screen set. Non-inclusion is acceptable, not a gap.
- §4.5 `report.md` — native download via `Content-Disposition` ✅.
- §4.6 `GET /api/tools` — every field (`scanners[].{tool,available,version,required}`, `claude`, `limits`) mapped in §5.9 ✅.
- §4.7 `ScanResult` — scanId/createdAt/detection/toolsRun/toolsSkipped/findings/summary/limits/report all mapped ✅. `summary.degraded`/`enrichedByClaude`/`notes`/`limits.truncated`/`report.available` all correctly treated (degraded/skipped-claude = **normal** states styled as warnings, report still available) ✅.
- §4.8 error enum — **all 16 codes present** in §7 (NO_FILE, NOT_A_ZIP, UPLOAD_TOO_LARGE, VALIDATION_ERROR, ZIP_MALFORMED, EXTRACTED_TOO_LARGE, TOO_MANY_FILES, NESTING_TOO_DEEP, ZIP_SLIP_DETECTED, SYMLINK_REJECTED, COMPRESSION_RATIO_EXCEEDED, SCAN_TIMEOUT, NO_SCANNERS_AVAILABLE, SESSION_NOT_FOUND, REPORT_NOT_READY, INTERNAL) with surface + retryability ✅.

### SPEC §5 data model rendered by the report view

- `Finding`: severity→badge/filter ✅ · category→tag/filter (full 6-value display map) ✅ · **`file`/`line` nullable** → Location null-guard "—"/"project" + drawer note ✅ · sourceTool→Tool cell ✅ · `ruleId` nullable→drawer ✅ · title ✅ · description→drawer pre-wrap plain text ✅ · **`remediation` single string**→client split to `<ol>` ✅ · references[]→drawer links ✅ · confidence→drawer pill ✅ · `enrichedByClaude`→AI tag logic ✅ · `codeSnippet` optional→fenced escaped block ✅ · **`sources[]`>1**→"N tools"/"Also reported by" ✅.
- `DetectedFramework`, `DetectionResult`, `ToolRunInfo` (incl `mode`), `ToolSkipInfo`, `ScanSummary`, `EnforcedLimits`, `report` — all consumed. ✅
- Severity enum (5) has full solid+soft token sets + ordering const ✅.

**Coverage conclusion: complete.** No missing screen, component, state, error code, or data field.

---

## 2. Exactness

- Every color is a concrete **hex**; every size a **number**; no `TBD`/placeholder values. ✅
- All three breakpoints **375 / 768 / 1280** defined (§3.2) with per-screen layouts at each. ✅
- Responsive contract matches SPEC/handoff: two-col Upload ≥1024, Category col drops <1024, table→cards <640, drawer bottom-sheet <768, no horizontal page scroll. ✅ (internally consistent: 768 is <1024 so Category drops; 375 is <640 so cards.)
- Minor vagueness (advisory, non-blocking): FindingsTable header `position:sticky; top: /* below toolbar */` (§5.6) leaves the sticky offset as a comment because the toolbar has no fixed height; developer must compute `56 + toolbar height` or use layout. Acceptable for a spec.
- Minor under-spec (advisory): framework enum→display-name and SourceTool→label maps are given by example ("next→Next.js", "osv-scanner→OSV", "claude-cli→Claude") rather than exhaustively for all 8 frameworks / 7 tools. Obvious to infer; not blocking.

---

## 3. Contrast — computed from actual hex values (WCAG 2.1, sRGB)

**Light theme — every claim verified accurate (matches spec to 2 dp):**

| Pair | Computed | Spec claim | AA |
|---|---|---|---|
| white on critical/high/medium/low/info solid | 6.57 / 5.52 / 5.43 / 5.99 / 7.69 | 6.6/5.0/5.4/6.0/7.7 | ✅ all ≥4.5 |
| severity soft-text on soft-bg (all 5) | 7.18 / 6.99 / 4.78 / 5.57 / 6.98 | "≥5.6 (crit 7.2)" | ✅ all ≥4.5 |
| text-primary/secondary/tertiary on surface | 17.75 / 7.69 / 4.97 | 17.9/7.7/4.98 | ✅ |
| white on `--primary` (light) | 6.29 | 6.3 | ✅ |
| text-tertiary on `--bg` / on `--surface-2` header | 4.64 / 4.51 | — | ✅ (just clears 4.5) |

**Dark theme — mostly pass, one control-type FAILS:**

| Pair | Computed | AA (4.5) |
|---|---|---|
| dark text-primary/secondary/tertiary on surface | 16.38 / 10.35 / 6.83 | ✅ |
| dark severity soft (all 5) | 8.3–10.6 | ✅ |
| dark semantic soft-text (success/warning/danger) | 9.1 / 9.0 / 8.4 | ✅ |
| dark AI tag `--primary-text` on `--primary-soft` | 8.17 | ✅ |
| **dark PRIMARY BUTTON label — white `--text-inverse` on `--primary` #818CF8** | **2.98** | ❌ |
| **…hover #A5B0FB / pressed #6772E5** | **2.06 / 4.11** | ❌ |
| dark danger button — white on `--danger` #FDA29B (latent; not used in flows) | ~1.6 | ❌ |

**Root cause (BUG-001).** `--text-inverse` (#FFFFFF) is defined once in §2.1 and is **not remapped** in the §2.4 dark table, while `--primary` is lightened to `#818CF8` for dark. The primary button (§5.1) is `bg --primary; text --text-inverse`, so in dark the CTA label is white on a light indigo → **2.98:1** (hover 2.06, pressed 4.11), all under the 4.5:1 AA floor. The spec asserts the opposite: §2.4 "All values derived to keep AA", §8 "Dark theme values derived to the same thresholds — QA must re-verify dark." Re-verified: it does not hold for the primary CTA (Start scan / Download report / Try again) — the single most prominent control. The **danger** button shares the fault (dark `--danger` is a light salmon), though no danger button is used in the current flows.

Evidence the miss is an oversight, not intent: the **Tooltip** (§5.11) *does* manually override the same token for dark — "text `--text-inverse` (dark: `--text-primary`)" — so the designer knew `--text-inverse` needs a dark on-color, but did not apply the equivalent for the primary/danger buttons.

**Fix options (designer's call):** add a `--on-primary` (and `--on-danger`) token remapped per theme (dark → a near-black like `#0B0F1A`), OR darken dark `--primary`/`--danger` button fills so white clears 4.5:1, OR use a dark-text label on the dark accent. Then re-state the §8 AA claim for dark accurately.

### Advisory (non-blocking, not filed as bugs)

- §8 states "Non-text UI borders/focus meet 3:1." The **focus ring** (#4F46E5, 6.29:1) and severity badge borders do meet it, but default hairlines `--border` (1.24:1) and `--border-strong` (1.47:1) do not. This is not a WCAG 1.4.11 violation (default/decorative boundaries are exempt, and no control relies on border-alone — fills/text/icons/focus ring carry the affordance), so it is **not a blocking defect**. Recommend tightening the §8 sentence to avoid over-claiming, and darkening any border that is ever the sole boundary of an interactive control.

---

## 4. Consistency

- Tokens referenced in Layout/Components all exist in §2 token tables (spot-checked: `--sev-*-soft-*`, `--primary*`, `--surface-*`, `--space-*`, `--radius-*`, `--z-*`, `--dur-*`). ✅ except the on-solid text token which is under-provided for dark accents (BUG-001).
- Ordering constant `["critical","high","medium","low","info"]` used consistently for sort/chips/table. ✅
- Design Handoff (MAPPING §"Design Handoff") matches DESIGN_SPEC values (severity hexes, neutrals, type scale). ✅
- No Figma exists → "self-derived, values concrete" is honestly stated (§0); nothing cites a nonexistent frame. ✅
- No contradiction with SPEC found on: progress/polling model, report-available-when-degraded, NO_SCANNERS as scanning error (not report empty), no-execution/text-only rendering invariants. The designer correctly reconciled SPEC §10's "No scanners available" empty-state phrasing with §4.8's NO_SCANNERS_AVAILABLE error surface. ✅

---

## 5. Verdict & routing

**FAIL.** The spec is otherwise complete, exact, internally consistent, and correct
against SPEC §4/§5/§10 — an unusually thorough design doc. It fails on one
must-fix correctness defect: the delivered dark-theme token set makes the **primary
CTA label fall below WCAG AA (2.06–4.11:1)** while the spec claims dark meets AA.
Because the developer (T8) builds the button token verbatim from §5.1, this must be
corrected in the spec before implementation. Routes back to the **designer**.

- **BUG-001 (MED):** dark-theme solid-fill button labels use white `--text-inverse`
  on the lightened dark `--primary`/`--danger`, giving 2.06–4.11:1 (< 4.5:1 AA) on
  the primary/danger CTAs; §2.4/§8 wrongly claim dark meets AA. Fix per §3 options
  + re-verify dark and correct the §8 claim.
