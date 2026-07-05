# DESIGN_SPEC — Security Scanner

> **Task:** T1 (DESIGN). **Screens:** Upload · Scanning · Report.
> **Source of truth for behaviour/data:** `SPEC.md` §4 (API), §5 (data model), §10 (UI surfaces).
> **This document is the source of truth for every visual decision** — the developer
> (T8) implements from here plus the Design Handoff in `MAPPING.md`, not from chat.

## 0. Provenance & scope

- **No Figma exists.** Every value below is **self-derived** from the SPEC's UI
  requirements using modern, accessible defaults. Nothing here is Figma-sourced.
  Where a choice is a judgement call it is flagged, but all values are concrete.
- The app is a **single-user, localhost dashboard** for static security analysis.
  Visual language: calm, dense, information-first, trustworthy — closer to a
  developer tool (GitHub / Linear / Sentry) than a marketing site. No decorative
  imagery, no gradients-as-brand, no motion for its own sake.
- **Theme:** ships **light theme as primary** (§2.1–2.3) with a **complete dark
  theme token set** (§2.4). Every component is built against tokens, so it works
  in both. Developer wires `prefers-color-scheme` + an optional manual toggle.
- **Icons:** inline SVG only (no external icon font/CDN — the SPA makes only
  same-origin loopback calls). Names below reference the **Lucide** set as a
  concrete, MIT-licensed source the developer can copy paths from.
- **All copy strings in this spec are the exact UI copy** unless marked
  `{dynamic}`. Every value interpolated from the API is rendered as **text**
  (React auto-escape) — never `dangerouslySetInnerHTML` (SPEC §10).

### Table of contents
1. Design principles
2. Design tokens (color, severity system, dark theme, type, spacing, radii, shadow, z, motion, icons)
3. Layout & responsive grid
4. Screen specs — Upload, Scanning, Report
5. Component specs (with states + data mapping)
6. States matrix (loading / empty / error / degraded)
7. Error-code → UI copy mapping
8. Accessibility
9. Developer notes, gotchas, open questions

---

## 1. Design principles

1. **Severity is the primary visual axis.** Color + icon + text label always
   travel together (never color alone). Sort/scan order is critical → info.
2. **Honest degradation.** Missing tools and truncated scans are surfaced
   prominently, never hidden — the degraded banner and engine-status panel are
   first-class UI, not error states.
3. **Data density with air.** 14px base, 4px spacing grid, generous line-height.
   The findings table must fit ~8 rows above the fold at 1280 without scrolling.
4. **One accent.** A single indigo `--primary` drives all interactive/brand
   affordances so severity reds/ambers never fight the UI chrome.
5. **Everything keyboard-reachable.** Rows, filters, drawer, dropzone.

---

## 2. Design tokens

Deliver as CSS custom properties on `:root` (light) and `:root[data-theme="dark"]`
(+ `@media (prefers-color-scheme: dark)`). Token **names are contract** — the
developer should use these exact names.

### 2.1 Color — neutrals & brand (light theme)

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#F5F7FA` | App canvas / body background |
| `--surface` | `#FFFFFF` | Cards, panels, table, drawer, app bar |
| `--surface-2` | `#F2F4F7` | Table header, raised subtle fills, hover row, code block bg |
| `--surface-3` | `#EAECF0` | Pressed/active subtle, skeleton base |
| `--border` | `#E4E7EC` | Default hairline borders, dividers |
| `--border-strong` | `#D0D5DD` | Input borders, table outer border, focus-neighbour |
| `--text-primary` | `#101828` | Titles, table cell primary text |
| `--text-secondary` | `#475467` | Body, secondary cell text, labels |
| `--text-tertiary` | `#667085` | Meta, placeholder, disabled-ish, captions |
| `--text-inverse` | `#FFFFFF` | Text on **dark** solid fills only (severity solid badges, tooltip). **Not** used on the lightened dark accent buttons — those use `--on-primary`/`--on-danger` |
| `--primary` | `#4F46E5` | Primary buttons, links, active filter, focus ring, progress fill |
| `--primary-hover` | `#4338CA` | Primary hover |
| `--primary-pressed` | `#3730A3` | Primary active/pressed |
| `--on-primary` | `#FFFFFF` | **Label color on the primary-button fill** (per-theme; dark remaps to near-black `#0A0D16`, §2.4). Carries the CTA-label contrast so the fill can be lightened in dark |
| `--primary-soft` | `#EEF2FF` | Selected/active tint (chips, active nav, link hover bg) |
| `--primary-text` | `#3730A3` | Link/active text on light bg (AA on `--surface`) |

### 2.2 Color — severity system (the core of this UI)

Each severity has a **solid** variant (filled badge, white text) and a **soft**
variant (tinted pill for dense tables + summary chips + drawer). Hues are chosen
to be **distinguishable** and follow vuln-scanner convention (deep red → orange →
amber → blue → slate). Because the label text always renders too, color is never
the only channel.

| Severity | `--sev-*-solid` (fill) | on-solid text | `--sev-*-soft-bg` | `--sev-*-soft-text` | `--sev-*-border` | icon (Lucide) |
|---|---|---|---|---|---|---|
| **critical** | `#B42318` | `#FFFFFF` | `#FEE4E2` | `#912018` | `#FDA29B` | `octagon-alert` |
| **high** | `#C4320A` | `#FFFFFF` | `#FFF3E9` | `#9C2A10` | `#F7B27A` | `triangle-alert` |
| **medium** | `#B54708` | `#FFFFFF` | `#FEF0C7` | `#B54708` | `#FEC84B` | `alert-circle` |
| **low** | `#175CD3` | `#FFFFFF` | `#EFF8FF` | `#175CD3` | `#B2DDFF` | `info` |
| **info** | `#475467` | `#FFFFFF` | `#F2F4F7` | `#475467` | `#D0D5DD` | `circle-dot` |

Token names, e.g.: `--sev-critical-solid`, `--sev-critical-soft-bg`,
`--sev-critical-soft-text`, `--sev-critical-border`, and `--sev-critical-on-solid`
(= `#FFFFFF` for all five).

**Ordering constant** (drives sort, chips, table default order):
`["critical","high","medium","low","info"]`.

**Verified contrast** (computed, sRGB WCAG 2.1):
- White on every `--sev-*-solid`: critical 6.6:1, high 5.0:1, medium 5.4:1, low 6.0:1, info 7.7:1 — **all ≥ 4.5 (AA text)**.
- `--sev-*-soft-text` on its `--sev-*-soft-bg`: all ≥ 5.6:1 (critical 7.2:1) — **AA**.

### 2.3 Color — semantic (success / warning / error / focus)

| Token | Hex | Use |
|---|---|---|
| `--success` | `#067647` | "No findings" success, available-tool check |
| `--success-soft-bg` | `#ECFDF3` | Success banner/empty-state bg |
| `--success-border` | `#A6F4C5` | Success banner border |
| `--warning` | `#B54708` | Degraded / truncated banner accent + icon (shares amber with `medium`) |
| `--warning-soft-bg` | `#FFFAEB` | Degraded / truncated banner bg |
| `--warning-border` | `#FEDF89` | Warning banner border |
| `--danger` | `#D92D20` | Hard error state accent + icon, danger button |
| `--danger-hover` | `#B42318` | Danger button hover |
| `--danger-pressed` | `#912018` | Danger button active/pressed |
| `--on-danger` | `#FFFFFF` | **Label color on the danger-button fill** (per-theme; dark remaps to near-black `#0A0D16`, §2.4) |
| `--danger-soft-bg` | `#FEF3F2` | Error banner bg |
| `--danger-border` | `#FDA29B` | Error banner border |
| `--focus-ring` | `#4F46E5` | `outline` color for `:focus-visible` (= `--primary`) |
| `--overlay` | `rgba(16,24,40,0.50)` | Drawer/modal scrim |

### 2.4 Dark theme tokens (`:root[data-theme="dark"]`)

Same token names, remapped. Severity **solid** fills are unchanged (they already
carry white text and read fine on dark — dark reds/oranges/slate, white ≥ 4.5:1 in
both themes). Neutrals and the **soft** variants change (dark tint bg + light text).

**Accent buttons (`--primary`, `--danger`) are *lightened* for dark-surface
legibility, so white text would fail on them.** The fix (BUG-001): the per-theme
**on-accent** tokens `--on-primary` / `--on-danger` flip from white (light) to a
**near-black ink `#0A0D16`** (dark), and the *label* — not the fill — carries the
contrast (a "tonal button"; see §5.1). `--text-inverse` stays `#FFFFFF` and is used
only on the dark severity solids and the tooltip. Every accent-CTA state was
re-computed ≥ 5:1 in dark (§8) — this replaces the earlier (incorrect) assumption
that white-on-`--primary` held in dark (it was only 2.98:1).

| Token | Hex |
|---|---|
| `--bg` | `#0B0F1A` |
| `--surface` | `#131926` |
| `--surface-2` | `#1B2233` |
| `--surface-3` | `#252E43` |
| `--border` | `#2A3350` |
| `--border-strong` | `#3A4568` |
| `--text-primary` | `#F5F7FA` |
| `--text-secondary` | `#C0C7D4` |
| `--text-tertiary` | `#98A2B3` |
| `--text-inverse` | `#FFFFFF` (unchanged; severity solids + tooltip only) |
| `--primary` | `#818CF8` |
| `--primary-hover` | `#A5B0FB` |
| `--primary-pressed` | `#6E78EE` (lightened from `#6772E5` so the near-black label clears 5:1) |
| `--on-primary` | `#0A0D16` (near-black label ink — **dark override of the light `#FFFFFF`**) |
| `--primary-soft` | `#1E2547` |
| `--primary-text` | `#B4BCFB` |
| `--overlay` | `rgba(0,0,0,0.60)` |

Dark **severity soft** variants (`--sev-*-soft-bg` / `--sev-*-soft-text`):

| Severity | soft-bg | soft-text |
|---|---|---|
| critical | `#3A1512` | `#FDA29B` |
| high | `#3A1D0C` | `#F7B27A` |
| medium | `#3A2A0A` | `#FEC84B` |
| low | `#0E2440` | `#84CAFF` |
| info | `#1B2233` | `#CDD3DE` |

Dark semantic (**soft / banner** roles): `--success #75E0A7 / soft-bg #0A2E1E`,
`--warning #FEC84B / soft-bg #3A2A0A`, `--danger #FDA29B / soft-bg #3A1512`. Light
salmon/amber/green text on the deep tints all exceed 4.5:1.

**Dark danger *button* fills** (tonal salmon ramp — distinct from the soft/banner
role above; the light dark-red hover/pressed would clash on the light-salmon default,
so they are remapped here):

| Token | Hex | On-fill contrast (ink `--on-danger #0A0D16`) |
|---|---|---|
| `--danger` (default) | `#FDA29B` | 10.00:1 |
| `--danger-hover` | `#FEBCB6` | 12.09:1 |
| `--danger-pressed` | `#F98E86` | 8.54:1 |
| `--on-danger` | `#0A0D16` | — (near-black label ink; dark override of light `#FFFFFF`) |

> Every component below references tokens only; no component hard-codes a hex.

### 2.5 Typography

- **UI font stack:** `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- **Mono font stack** (`file:line`, code snippets, versions):
  `ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace`
- **Base:** `html { font-size: 16px }`, `body { font-size: 14px; line-height: 20px; color: var(--text-secondary) }`. Data UI runs at 14px.

Type scale (name · size / line-height · weight · use):

| Token | Size / LH | Weight | Use |
|---|---|---|---|
| `--font-display` | 24 / 32 | 600 | Page title (app bar / report header H1) |
| `--font-h2` | 18 / 26 | 600 | Section headings, drawer finding title |
| `--font-h3` | 16 / 24 | 600 | Card titles, subsection, table-row title (emphasis) |
| `--font-body` | 14 / 20 | 400 | Default body + table cells |
| `--font-body-strong` | 14 / 20 | 600 | Emphasis, active labels, numbers in chips |
| `--font-small` | 13 / 18 | 400 | Meta, drawer meta rows, tool versions |
| `--font-label` | 12 / 16 | 500 | Table column headers (UPPERCASE, letter-spacing 0.04em), badge text |
| `--font-mono` | 13 / 20 | 450 | `file:line`, inline code |
| `--font-code` | 13 / 20 | 400 | Fenced code snippet block (mono) |

- Numerals in tables/chips: prefer `font-variant-numeric: tabular-nums`.
- Long titles/paths: `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` in table cells; full value in `title=` attr + shown untruncated in the drawer.

### 2.6 Spacing scale (4px grid)

| Token | px | | Token | px |
|---|---|---|---|---|
| `--space-1` | 4 | | `--space-6` | 24 |
| `--space-2` | 8 | | `--space-8` | 32 |
| `--space-3` | 12 | | `--space-10` | 40 |
| `--space-4` | 16 | | `--space-12` | 48 |
| `--space-5` | 20 | | `--space-16` | 64 |

Extra: `--space-0-5 = 2px` (badge internal, icon gaps). All paddings/margins/gaps
use these tokens — no arbitrary pixel values in implementation.

### 2.7 Radii, borders, shadows, z-index, motion

**Radii:** `--radius-sm 4` (inputs, small buttons) · `--radius-md 6` (buttons, cards inner, chips) · `--radius-lg 8` (cards, panels, banners) · `--radius-xl 12` (dropzone, drawer top corners on mobile) · `--radius-full 9999` (severity badge pill, status dots).

**Borders:** hairline `1px solid var(--border)`; interactive/input `1px solid var(--border-strong)`; dropzone `2px dashed var(--border-strong)`.

**Shadows** (light; dark uses `rgba(0,0,0,·)` at ~2× alpha):
- `--shadow-xs`: `0 1px 2px rgba(16,24,40,0.05)`
- `--shadow-sm`: `0 1px 3px rgba(16,24,40,0.10), 0 1px 2px rgba(16,24,40,0.06)`
- `--shadow-md`: `0 4px 8px -2px rgba(16,24,40,0.10), 0 2px 4px -2px rgba(16,24,40,0.06)`
- `--shadow-lg`: `0 16px 32px -8px rgba(16,24,40,0.14), 0 6px 12px -6px rgba(16,24,40,0.08)` (drawer, popovers)

**Z-index:** `--z-base 0` · `--z-sticky 10` (report toolbar) · `--z-appbar 20` · `--z-tablehead 15` · `--z-banner 25` · `--z-overlay 100` (scrim) · `--z-drawer 110` · `--z-popover 120` (dropdowns/tooltip) · `--z-toast 200`.

**Motion:** durations `--dur-fast 120ms` (hover/press/badge), `--dur-base 200ms` (fades, dropdowns), `--dur-slow 300ms` (drawer slide). Easing `--ease-standard cubic-bezier(0.2,0,0,1)` (enter/exit), `--ease-out cubic-bezier(0,0,0.2,1)`. **All transitions wrapped in `@media (prefers-reduced-motion: no-preference)`**; under reduced-motion, use opacity-only ≤ 1 frame or none. Progress bar and drawer must degrade to instant.

### 2.8 Iconography

- Size tokens: `--icon-sm 16` · `--icon-md 20` · `--icon-lg 24` · `--icon-xl 40` (dropzone/empty-state hero).
- Stroke 1.75px (Lucide default 2 at 24; use 1.75 at 16/20 for balance). Color inherits `currentColor` unless a semantic override.
- Concrete icon map (Lucide names): app logo `shield-check` · upload `upload-cloud` · file `file-archive` · scanning `loader` (spin) or `radar` · success/no-findings `shield-check` · degraded/truncated `triangle-alert` · error `octagon-x` · claude/AI tag `sparkles` · copy `copy` · download `download` · close `x` · search `search` · filter `sliders-horizontal` · sort `chevrons-up-down`/`arrow-up`/`arrow-down` · external ref `arrow-up-right` · available `check-circle` · unavailable `circle-slash` / `minus-circle` · cancel `x-circle`. Severity icons per §2.2 table.

---

## 3. Layout & responsive grid

### 3.1 App shell (all screens)

- **App bar:** height `56px`, `position: sticky; top:0; z:var(--z-appbar)`, `background: var(--surface)`, `border-bottom: 1px solid var(--border)`. Left: `shield-check` icon (20, `--primary`) + wordmark **"Security Scanner"** (`--font-h3`) + muted tag "· static analysis" (hidden < 375 edge). Right: theme toggle (icon button, optional) and, on Report, a compact scan-id chip `scan {first8}…` (`--font-mono`, `--text-tertiary`). App bar horizontal padding matches container gutter.
- **Content container:** `max-width: 1200px`, centered (`margin-inline: auto`), horizontal padding = gutter (below). Vertical padding top `--space-8` (32) desktop / `--space-6` (24) mobile.

### 3.2 Breakpoints & gutters

| Name | Range | Container gutter | Notes |
|---|---|---|---|
| **mobile** | `< 640px` (design target **375**) | `16px` | Single column; table → stacked cards; drawer → bottom sheet full-width |
| **tablet** | `640–1023px` (design target **768**) | `24px` | Single column; real table (condensed cols); drawer = right sheet |
| **desktop** | `≥ 1024px` (design target **1280**) | `32px` | Two-col upload; full table; right drawer |

Design must be verified at exactly **375 / 768 / 1280** (QA screenshots). Additional
internal breakpoints allowed but these three are the contract.

---

## 4. Screen specs

The SPA is a 3-state machine (`upload → scanning → report`) in `App.tsx` (SPEC §10).
Transitions are in-app (no route change required); a hard refresh returns to Upload
(state is ephemeral, matching the ephemeral backend).

### 4.1 Upload screen (`Upload.tsx`)

**Purpose:** choose a `.zip`, see engine coverage before scanning, optionally set
scanners-only, then `POST /api/scan`.

**Layout**
- **1280 (desktop):** CSS grid, 2 columns — main `minmax(0,1fr)` (the dropzone card, max-width 640) + aside `340px`, `gap: var(--space-8)`, `align-items: start`. Aside = engine-status panel (§5.9), sticky at `top: 88px` if page scrolls.
- **768 (tablet):** single column, `max-width: 640` centered. Dropzone first, engine-status panel below, both full width.
- **375 (mobile):** single column, full-bleed within 16px gutter. Dropzone `min-height: 200`; engine panel below, collapsible (see §5.9).

**Above the dropzone:** H1 `--font-display` "Scan a project for vulnerabilities" + one line `--font-small --text-tertiary`: "Upload a `.zip`. Static analysis only — nothing is installed or executed. {dynamic: maxUploadBytes → "Up to 100 MB."}"

**Dropzone card** — see component §5.3. Below it, a row: **scanners-only toggle** (§5.2) left, **primary CTA "Start scan"** (§5.1) right. CTA disabled until a valid file is chosen.

**Interaction flow**
1. Drag file over → dropzone enters `dragover` state.
2. Drop / pick → client pre-check (extension `.zip`, size ≤ maxUploadBytes from `/api/tools`). **UX only** — server is source of truth (SPEC §10). On fail → inline field error under dropzone, do not transition.
3. Valid → dropzone shows selected-file state (name + human size + `x` to clear). CTA enables.
4. Click "Start scan" → CTA → loading (spinner + "Uploading…"), `POST /api/scan` multipart (`file`, `mode`). On **202** `{scanId}` → transition to Scanning. On sync error envelope (`NO_FILE`/`NOT_A_ZIP`/`UPLOAD_TOO_LARGE`/`VALIDATION_ERROR`) → map via §7, show inline error, re-enable.

**Engine-status panel** (§5.9) fetched on mount via `GET /api/tools`. If any required scanner or claude is unavailable, panel shows a soft inline degraded hint ("Coverage will be reduced — see below") but **never blocks** scanning. Only if `scanners.filter(required && available)` is empty AND no optional available → show a warning that a scan will fail with `NO_SCANNERS_AVAILABLE`; keep CTA enabled (server decides) but warn.

### 4.2 Scanning / progress screen (`Scanning.tsx`)

**Purpose:** live phase/progress, cancel, surface truncation + errors.

**Layout:** centered card, `max-width: 560`, `margin-top: var(--space-16)` (desktop) / `--space-8` (mobile), `padding: var(--space-8)`, `--shadow-sm`, `--radius-lg`. Full-width within gutter on mobile.

**Anatomy (top→bottom)**
1. Header row: spinning `radar`/`loader` icon (24, `--primary`) + H2 "Scanning your project" + muted `scan {first8}…` (`--font-mono --text-tertiary`).
2. **Progress bar** (§5.4): determinate, driven by `progress` (0..1) from `GET /api/scan/:id`. Height 8, `--radius-full`, track `--surface-3`, fill `--primary`. Show `{Math.round(progress*100)}%` right-aligned above.
3. **Phase stepper** (§5.5): vertical list of the 5 working phases `extracting → detecting → scanning → enriching → assembling` (map `done` = all complete → transition). Each: state icon (done = `check-circle` success · active = spinner · pending = hollow `circle` tertiary) + label + optional sublabel. Current phase label `--font-body-strong --text-primary`; done `--text-secondary`; pending `--text-tertiary`.
   - Phase display copy: extracting → "Extracting archive safely" · detecting → "Detecting frameworks" · scanning → "Running scanners" · enriching → "AI analysis (Claude Code)" · assembling → "Assembling report". If `mode === "scanners-only"` OR claude unavailable, render the enriching step as skipped (muted, `minus-circle`, sublabel "skipped — {reason}").
4. **Truncated warning** (§5.8 banner, `warning`): shown when a poll returns `limits.truncated` (only present once ScanResult exists, or via SSE message) — "Large project — resource limit reached; results are partial." Persistent for the rest of the run and carried into the report header.
5. **Cancel** control: secondary/ghost button "Cancel scan" (`x-circle`), bottom of card. On click → abort request to backend (best-effort; SPEC: backend kills children + cleans temp) and return to Upload with a subtle toast "Scan cancelled." No destructive confirm dialog (single-user, cheap to restart).

**Polling:** poll `GET /api/scan/:id` every **1000ms** (baseline; SSE optional per SPEC §4.3 — if SSE used, drive phase/progress/message from events and stop polling). On `status:"done"` → fetch not needed (result is in the same body) → transition to Report with `result`. On `status:"error"` → render **error state** (§4.2 error) mapping `error.code` via §7 inside the card: `octagon-x` (24 `--danger`) + mapped title + message + two actions: "Start over" (→ Upload) and, when retryable, "Try again". On `404 SESSION_NOT_FOUND` mid-poll → treat as expired: message "This scan session expired." + "Start over".

### 4.3 Report / results screen (`Report.tsx` + `FindingsTable` + `FindingDetail`)

**Purpose:** the full `ScanResult` — header context, filterable findings table,
detail drawer, `.md` download.

**Overall layout**
- **Header block** (§4.3.a) — full container width.
- **Sticky toolbar** (§4.3.b) — `position: sticky; top: 56px; z:var(--z-sticky)`, `background: var(--bg)`, `border-bottom: 1px solid var(--border)`, vertical padding `--space-3`. Holds filters + result count + download.
- **Findings table / cards** (§5.6) — scroll region below toolbar.
- **Detail drawer** (§5.7) — overlay, opened by a row.

#### 4.3.a Report header

Order and data mapping (all from `ScanResult`, SPEC §4.7/§5):

1. **Title row:** H1 `--font-display` "Scan results" + right-aligned **Download report** button (§5.1 primary, icon `download`) → `GET /api/scan/:id/report.md` (native download via `Content-Disposition`). If `report.available === false`, button disabled + tooltip (§5.11) "Report not available for this scan." (Per SPEC, report is available even when degraded, so this is a rare edge.)
2. **Degraded banner** (§5.8, `warning`) — rendered iff `summary.degraded === true`. Copy chooses by cause:
   - claude in `toolsSkipped` with `reason:"claude-unavailable"` → **"AI enrichment unavailable — showing scanner-only results."** (icon `sparkles`-off / `triangle-alert`).
   - a `required` scanner missing → **"Degraded scan — {tool} not available; {note}."** using `summary.notes[0]` when present.
   - both → combine; if `summary.notes.length` list them as bullet sublines.
3. **Truncated banner** (§5.8, `warning`, separate) — iff `limits.truncated` → "Partial scan — a resource limit was reached; some files were not analyzed."
4. **Severity summary chips** (§5.10) — one soft chip per severity from `summary.bySeverity`, in order critical→info, each `Icon Label {count}`. Zero-count severities render muted (not hidden) so the row is stable. Clicking a chip = shortcut that toggles that severity filter (syncs with the filter bar). Also show `total` as a leading count "{total} findings".
5. **Context strip** (`--font-small --text-secondary`, wraps): 
   - **Stack:** `detection.detectedFrameworks` → "`Next.js, React (JavaScript)`" (map framework enum → display names; show `primaryLanguage`); if empty → "No known framework detected — generic scan."
   - **Tools run:** `toolsRun` → "semgrep 1.90.0 · osv-scanner 1.9.1 · gitleaks 8.18.4 · claude-cli" (name + version; claude-cli shows `mode`). Each item as a small neutral chip.
   - **Tools skipped:** `toolsSkipped` → muted chips "trivy (not installed)", "pip-audit (no Python project)" — map `reason` enum → friendly text (§7 has the reason map).

#### 4.3.b Filter toolbar (client-side, in-memory `findings` — no server round-trip)

Left→right (wraps on tablet/mobile):
- **Severity filter:** the summary chips double as toggles, OR a dedicated multi-select segmented group (§5.10 interactive). Multi-select; default all on.
- **Tool filter:** multi-select dropdown (§5.11 select), options = distinct `sourceTool` present in findings (+ counts). Label "Tool".
- **Category filter:** multi-select dropdown, options = distinct `category` (`vulnerable-dependency`→"Dependency", `sast`→"Code", `secret`→"Secret", `misconfiguration`→"Config", `logic-flaw`→"Logic", `other`→"Other"). Label "Category".
- **Free-text search:** input (§5.11 search), `search` icon, placeholder "Filter by file or title", **debounce 150ms**, case-insensitive match on `title` + `file`.
- **Clear filters** ghost link — visible only when any filter is non-default.
- **Result count** (`--font-small --text-tertiary`): "Showing {n} of {total}".
- **Download report** may live here on mobile (see responsive).

**Filter semantics:** severity/tool/category are OR within a facet, AND across facets; free-text ANDed on top. All recomputed client-side from the in-memory array.

#### 4.3.c Findings table

Full spec in §5.6. Columns (desktop): **Severity · Title · Location · Tool · Category**. Sortable. Row click/Enter → drawer. Responsive collapse rules in §5.6.

**Empty states** (§6):
- No findings at all (`findings.length === 0`, `status done`): **success empty state** (§5.12) — `shield-check` 40 `--success`, "No findings" heading, subtext "No security issues were detected by the tools that ran." Still show the degraded/truncated banners above and keep **Download report** enabled (report exists).
- No findings **after filtering** (findings exist but 0 match): neutral empty state inside the table region — `search-x`, "No findings match your filters", "Clear filters" button.
- No scanners available: this surfaces as an **error** during scanning (`NO_SCANNERS_AVAILABLE`, §7), not a report — but if a report renders with the note, show the degraded banner prominently.

**Responsive**
- **1280:** all 5 columns; drawer as right sheet (see §5.7).
- **768:** drop **Category** column (its value moves into the drawer + as a tiny tag under Title); keep Severity · Title · Location · Tool. Toolbar filters wrap to 2 rows; Download stays top-right in header. Drawer = right sheet, width `min(440px, 90vw)`.
- **375:** table → **stacked cards** (§5.6 card mode). Toolbar becomes: search full-width row 1; a "Filters" button (opens a bottom-sheet with severity/tool/category) row 2 with the result count; Download report becomes a full-width button under the header. Drawer = **bottom sheet**, `height: 92vh`, top corners `--radius-xl`, drag-handle affordance.

---

## 5. Component specs

Every component lists: anatomy, dimensions, states, and data mapping. States
covered where applicable: default · hover · focus-visible · active/pressed ·
disabled · loading · error · selected/empty.

### 5.1 Button

Variants: **primary** (filled `--primary`), **secondary** (surface + `--border-strong`), **ghost** (transparent, text `--text-secondary`), **danger** (filled `--danger`). Sizes: **md** (default) height `40px` desktop / `44px` mobile (touch), padding-inline `16`, `--font-body-strong`, `--radius-md`, icon+label gap `8`; **sm** height `32`, padding-inline `12`, `--font-small`.

| State | Primary treatment |
|---|---|
| default | bg `--primary`, text **`--on-primary`**, `--shadow-xs` |
| hover | bg `--primary-hover`, text `--on-primary` |
| active/pressed | bg `--primary-pressed`, text `--on-primary`, translateY(0.5px) |
| focus-visible | `outline: 2px solid var(--focus-ring); outline-offset: 2px` |
| disabled | bg `--surface-3`, text `--text-tertiary`, no shadow, `cursor:not-allowed`, `opacity` not used for a11y contrast |
| loading | show 16px spinner replacing leading icon, label → "Uploading…"/"Working…", keep width (disabled-but-not-dim), `aria-busy="true"` |

**On-accent label = `--on-primary` (never hard-code white).** It is `#FFFFFF` in
light and near-black `#0A0D16` in dark, so the label carries the contrast even though
the dark fill is a light indigo. Every state clears WCAG AA on both themes — light
6.29 / 7.90 / 9.93:1 (default/hover/pressed), dark **6.51 / 9.43 / 5.16:1** (§8).
This covers all solid-fill CTAs (Start scan, Download report, Try again).

Secondary: default border `--border-strong`, text `--text-primary`, bg `--surface`; hover bg `--surface-2`. Ghost: hover bg `--surface-2`. **Danger** mirrors primary with the danger token set: bg `--danger` → hover `--danger-hover` → pressed `--danger-pressed`, text **`--on-danger`** (white in light, near-black `#0A0D16` in dark). Danger contrast — light 4.83 / 6.57 / 8.66:1, dark **10.00 / 12.09 / 8.54:1** (§8), all AA.

Icon-only button (theme toggle, drawer close, clear-file): 36×36 (44 on mobile), `--radius-md`, transparent, hover `--surface-2`, requires `aria-label`.

### 5.2 Toggle (scanners-only switch)

Switch, `44×24` track, `20`-dia thumb, `--radius-full`. Off: track `--border-strong`, thumb `--surface`. On: track `--primary`, thumb `--surface`, thumb slides right (transition `--dur-fast`). Label right of switch `--font-body`: "Scanners only (skip AI analysis)". Helper `--font-small --text-tertiary`: "Runs open-source scanners without Claude Code." Focus-visible ring on the track. `role="switch"` `aria-checked`. Sets `POST /api/scan` `mode` = `"scanners-only"` when on, else `"full"`. Touch target ≥ 44 tall (pad the row).

### 5.3 Dropzone

Card: `--radius-xl`, `2px dashed var(--border-strong)`, bg `--surface`, `padding: var(--space-10)` (desktop) / `--space-6` (mobile), `min-height: 280` desktop / `200` mobile, centered flex column, gap `--space-3`.

Contents (empty): `upload-cloud` icon 40 `--text-tertiary`; line 1 `--font-h3 --text-primary` "Drop your project `.zip` here"; line 2 `--font-small --text-tertiary` "or"; **secondary button** "Browse files" (opens hidden `<input type=file accept=".zip">`); footnote `--font-small --text-tertiary` "Single .zip, up to {maxUploadBytes}. Static analysis only."

| State | Treatment |
|---|---|
| default | as above |
| hover (pointer over) | border `--primary`, bg `--primary-soft` at 40% (use `--primary-soft`) |
| dragover | border `--primary` solid-feel (keep dashed), bg `--primary-soft`, icon → `--primary`, scale content 1.01 (reduced-motion: none) |
| focus-visible (whole zone is a button) | outline ring |
| selected file | swap contents: `file-archive` icon 24 `--primary` + filename (`--font-body-strong`, ellipsis) + human size (`--font-small --text-tertiary`) + ghost icon-button `x` "Remove file"; border becomes solid `--border-strong`, bg `--surface` |
| error (invalid pick) | border `--danger`, and an error line below the zone (`--font-small`, `--danger`, `octagon-x` 16): e.g. "That's not a .zip file." / "File exceeds 100 MB." — clears on next valid pick |

Keyboard: the zone is a `role="button" tabindex=0` that triggers the file input on Enter/Space; the input itself is also focusable. `aria-describedby` points at the footnote + any error.

### 5.4 ProgressBar

Track: full-width, height `8`, `--radius-full`, bg `--surface-3`. Fill: `--primary`, width `= progress*100%`, transition `width var(--dur-base) var(--ease-out)`. `role="progressbar"` `aria-valuemin=0 aria-valuemax=100 aria-valuenow={pct}` `aria-label="Scan progress"`. Indeterminate fallback (if `progress` unknown early): 30%-wide shimmer sliding L→R, 1.4s loop (reduced-motion: static 8% fill + `aria-valuetext="in progress"`).

### 5.5 PhaseStepper

Vertical list, each row: `gap 12`, `padding-block 8`, connector line (`1px` `--border`) between icons optional. Icon slot 20px. Row states: **done** (`check-circle` `--success`, label `--text-secondary`), **active** (spinner `--primary`, label `--font-body-strong --text-primary`, optional animated sublabel e.g. "3 of 5 scanners…" if available via SSE message), **pending** (`circle` hollow `--text-tertiary`, label `--text-tertiary`), **skipped** (`minus-circle` `--text-tertiary`, label struck/muted + sublabel reason). Derived from `status` + phase order; `aria-current="step"` on active; wrap in `aria-live="polite"` region announcing the active phase label.

### 5.6 FindingsTable

**Container:** `--surface`, `--radius-lg`, `1px solid var(--border)`, `overflow: hidden`; horizontal scroll only within its own `overflow-x:auto` wrapper if columns exceed width (never the page).

**Header row:** height `44`, bg `--surface-2`, `position: sticky; top: /* below toolbar */; z:var(--z-tablehead)`, `--font-label` UPPERCASE `--text-tertiary`, `border-bottom: 1px solid var(--border)`. Sortable headers are buttons with a trailing sort glyph: unsorted `chevrons-up-down` (muted), asc `arrow-up`, desc `arrow-down` (`--primary`). `aria-sort` = `none|ascending|descending`.

**Columns (desktop 1280):**

| Col | Width | Content | Sort key |
|---|---|---|---|
| Severity | `112` | SeverityBadge (soft) | severity rank (critical=0) — **default sort, asc** |
| Title | `flex 1 (min 240)` | `Finding.title`, `--font-body-strong --text-primary`, ellipsis; second line (13/18 `--text-tertiary`) shows category tag on 768 collapse | alpha |
| Location | `220` | `--font-mono`: `${file}:${line}` or `file` only, or "—" when `file===null` (whole-project dep), or "project" tag; ellipsis from the left (`direction:rtl` trick) so the filename stays visible | alpha by file then line |
| Tool | `128` | `sourceTool` label (map `osv-scanner`→"OSV", `claude-cli`→"Claude"); if `sources?.length>1` show "N tools" with tooltip listing them | alpha |
| Category | `140` | category tag (neutral soft chip, §5.10 style but neutral) | alpha |

**Row:** height `52` (comfortable) / min-height, `padding-inline 16`, `border-bottom: 1px solid var(--border)`, vertical-align center. **Row is interactive** (`role="button" tabindex=0`, `aria-label` "Open finding: {title}").

| Row state | Treatment |
|---|---|
| default | bg `--surface` |
| hover | bg `--surface-2`, cursor pointer |
| focus-visible | inset `outline: 2px solid var(--focus-ring); outline-offset: -2px` |
| selected (its drawer open) | bg `--primary-soft`, left inset `3px solid var(--primary)` |
| loading | 8 skeleton rows (§5.13) — though data is in-memory so this is momentary/rare |
| empty | see §4.3.c empty states |

No zebra striping (borders provide separation). Do not truncate the drawer's copy — truncation is table-only.

**Responsive collapse:**
- **768:** hide Category column; append category as a tiny neutral tag on the Title cell's second line. Location may shrink to `160` with stronger ellipsis.
- **375 (stacked cards):** each finding = a card, `--surface`, `--radius-md`, `1px solid var(--border)`, `padding 12`, `margin-bottom 8`, tappable (whole card = button):
  - Row 1: SeverityBadge (soft, sm) + Tool tag (right).
  - Row 2: Title `--font-body-strong` (wraps to 2 lines max, then ellipsis).
  - Row 3: `--font-mono --text-tertiary` `file:line` (ellipsis) + category tag.
  Selected card gets `--primary` left border + `--primary-soft`. Sorting on mobile via a compact "Sort" select in the filter sheet.

**Data mapping recap:** consumes `Finding[]` from `ScanResult.findings` after client filters; row → opens `FindingDetail` with that `Finding` object (already in memory, no fetch).

### 5.7 FindingDetail (drawer)

Opened from a table row/card. Right-side **sheet** on ≥768; **bottom sheet** on <768.

**Overlay:** scrim `--overlay`, `z:var(--z-overlay)`, click-to-close, fade `--dur-base`.
**Panel:** `z:var(--z-drawer)`, bg `--surface`, `--shadow-lg`.
- ≥1024: width `min(480px, 40vw)`, full height, slides in from right (`transform: translateX` `--dur-slow --ease-standard`), left border `1px solid var(--border)`.
- 768: width `min(440px, 90vw)`, right sheet.
- <768: bottom sheet, `height: 92vh`, top corners `--radius-xl`, slides up; 32×4 drag-handle at top center.

**Anatomy (scroll region inside):**
1. **Sticky header:** SeverityBadge (soft, md) + close icon-button (`x`, top-right, `aria-label="Close"`). Below: finding **title** `--font-h2 --text-primary` (full, wraps). Then a meta chip row: **AI tag** (§5.10, if applicable), **confidence** pill (`--font-label`, neutral: "confidence: medium"), and `category` tag.
2. **Location block:** `--font-mono` `file:line` with a **copy** icon-button (`copy`) → copies `"{file}:{line}"` to clipboard → toast "Copied file:line" (§5.14) + icon momentarily → `check`. If `file===null`: show "Whole-project / dependency finding — no file location." `ruleId` shown beneath as `--font-small --text-tertiary` (e.g. "rule: javascript.express.xss" / "CVE-2023-1234").
3. **Description** section: heading `--font-label` "WHAT'S WRONG"; body `--font-body --text-secondary`, `white-space: pre-wrap` (preserve author line breaks), rendered as **plain text** (never HTML).
4. **Remediation** section: heading "WHAT TO CHANGE". `Finding.remediation` is a string; render as follows — split on newlines; if lines look like an enumerated/step list (leading `1.`, `-`, `*`, or multiple newline-separated lines) render as an **ordered list** (`<ol>`, numbered, gap 8); otherwise a paragraph (`pre-wrap`). Dependency findings ("upgrade X to ≥ Y") render as-is.
5. **Code snippet** (if `codeSnippet`): fenced block — `--surface-2` bg, `--radius-md`, `--font-code` mono, `padding 12`, `overflow-x:auto` inside its own container (never page scroll), line-wrap off. Read-only. A small `copy` button top-right of the block. Rendered as text (escaped) — never executed, never HTML.
6. **References** (if `references.length`): heading "REFERENCES"; list of links, each `--font-small`, `--primary-text`, trailing `arrow-up-right` 14; `target="_blank" rel="noopener noreferrer"`. If empty, omit the section.
7. **Sources** (if `sources?.length>1`): "Also reported by: {tool list}" `--font-small --text-tertiary`.

**States:** open/closed (animated). No async loading (data in memory). Empty references/snippet → omit those sections cleanly. Keyboard: `role="dialog" aria-modal="true" aria-labelledby={titleId}`, **focus trap**, focus moves to close button on open, **Esc closes**, focus returns to the originating row. Up/Down arrow while drawer open MAY move to prev/next finding (nice-to-have; keep row selection synced).

### 5.8 Banner (degraded / truncated / error / info)

Inline, full container width, `--radius-lg`, `padding: 12 16`, `1px solid`, icon (20) + text column + optional dismiss. **Not dismissible for degraded/truncated** (persistent state); error banners inside cards may offer actions. Variants:

| Variant | bg | border | icon | icon color |
|---|---|---|---|---|
| warning (degraded, truncated) | `--warning-soft-bg` | `--warning-border` | `triangle-alert` | `--warning` |
| danger (hard error) | `--danger-soft-bg` | `--danger-border` | `octagon-x` | `--danger` |
| success (no findings) | `--success-soft-bg` | `--success-border` | `shield-check` | `--success` |
| info (neutral notice) | `--primary-soft` | `--border` | `info` | `--primary` |

Text: title `--font-body-strong --text-primary`; optional body/bullets `--font-small --text-secondary`. `role="status"` (warning/info) or `role="alert"` (danger).

### 5.9 ToolStatus / engine-status panel

Panel card: `--surface`, `--radius-lg`, `1px solid var(--border)`, `--shadow-xs`, `padding 16`. Header row: `--font-h3` "Engine status" + a summary pill on the right — **"All systems"** (success soft) when nothing required is missing, else **"Degraded"** (warning soft). Consumes `GET /api/tools`.

**Scanner rows** (`scanners[]`): each row `padding-block 8`, `border-bottom: 1px solid var(--border)` (last none):
- Left: status icon — available `check-circle` `--success`; unavailable+required `triangle-alert` `--warning`; unavailable+optional `minus-circle` `--text-tertiary`.
- Tool name (`--font-body`, map to friendly label) + `required` tag (`--font-label` neutral "required") when `required`.
- Right: `version` (`--font-mono --text-tertiary`) when available, else muted "not installed".

**Claude row** (`claude`): same pattern, label "Claude Code (AI)", icon `sparkles`; unavailable → `minus-circle` `--text-tertiary` + "not found — scanner-only mode". Never styled as an error (it's optional by design).

**Limits footer** (`limits`): `--font-small --text-tertiary`, compact key facts: "Max upload {maxUploadBytes→"100 MB"} · max {maxFiles} files · {maxScanMs→"180s"} budget". Format bytes/ms human-readable.

**States:** loading (skeleton rows §5.13 while `/api/tools` in flight) · loaded · error (fetch failed → info banner inside panel "Couldn't load engine status" + "Retry"). On **mobile (375)** the panel is collapsible: a summary header (name + Degraded/All-systems pill + chevron) that expands the rows; collapsed by default below the dropzone.

**Reuse on Report:** the same data is summarized in the report header's "tools run/skipped" context strip (§4.3.a); the full panel is Upload-screen only, but the component is reusable if the developer wants a "coverage" popover on Report.

### 5.10 SeverityBadge + chips + tags

**SeverityBadge** — the atom. Pill (`--radius-full`), `--font-label` (12/16, weight 600, NOT uppercase — severity words read better mixed-case; letter-spacing 0.01em), height `sm 20` / `md 24`, padding-inline `8`, leading severity **icon** (§2.2) `12/14`, then label text "Critical/High/Medium/Low/Info". 
- **Soft variant** (default, tables/chips/drawer): bg `--sev-{s}-soft-bg`, text `--sev-{s}-soft-text`, `1px solid var(--sev-{s}-border)`.
- **Solid variant** (optional emphasis): bg `--sev-{s}-solid`, text `--sev-{s}-on-solid`.
- Prop `showCount?` renders trailing count for summary chips.
- `aria-label="{severity} severity"`; the visible text label satisfies the "not color-alone" rule.

**Summary chips (report header)** — SeverityBadge soft + count, in a wrap row. When used as **filter toggles**: add interactive states — default (as above), **selected/active** (border becomes 2px `--sev-{s}-soft-text` or a check dot prefix; keep it obvious which are on), **inactive/off** (desaturated: bg `--surface-2`, text `--text-tertiary`, border `--border`), hover (bg lift), focus-visible ring. Zero-count severities: rendered muted and **non-interactive** (nothing to filter).

**Category tag / Tool tag** — neutral pill, `--surface-2` bg, `--text-secondary`, `1px solid var(--border)`, `--radius-md`, `--font-label` mixed-case. Not colored (keeps severity the only colored channel in a row).

**AI tag** — special pill: `--primary-soft` bg, `--primary-text` text, `1px solid` transparent, leading `sparkles` 12. Copy: `sourceTool==="claude-cli"` → "AI-identified"; else `enrichedByClaude===true` → "AI-enriched". Tooltip: "Advisory — verify before acting." (matches SPEC's human-review framing).

### 5.11 Form controls (select, search, tooltip)

**Multi-select dropdown** (tool/category filters): trigger button (secondary style, `--font-body`, trailing `chevron-down`), label + count badge when active (e.g. "Tool (2)"). Panel: `--surface`, `--shadow-lg`, `--radius-md`, `1px solid var(--border)`, `z:var(--z-popover)`, max-height `280` scroll, each option = checkbox row (`check` when selected), hover `--surface-2`, includes per-option count. Footer "Clear" link. Keyboard: Arrow/Enter/Esc; `role="listbox"`/`option` or a menu with checkboxes; trigger `aria-expanded`. Closes on outside-click/Esc, returns focus to trigger.

**Search input:** height `40` (44 mobile), `--radius-md`, `1px solid var(--border-strong)`, leading `search` icon `--text-tertiary`, placeholder `--text-tertiary`, trailing `x` clear when non-empty. Focus: border `--primary` + ring. `type="search"`, `aria-label="Filter findings"`. Debounce 150ms.

**Tooltip:** dark bubble — bg `--text-primary` (dark theme: `--surface-3`), text `--text-inverse` (dark: `--text-primary`), `--font-small`, `--radius-sm`, `padding 6 8`, `--shadow-md`, `z:var(--z-popover)`, 6px arrow. Trigger on hover **and** focus (keyboard), 300ms open delay, no delay to close. `role="tooltip"` + `aria-describedby`. Used for: disabled Download button, multi-source "N tools", AI tag rationale, truncated table cells.

### 5.12 EmptyState

Centered block, `padding: var(--space-12) var(--space-6)`, max-width `420`, text-align center. Hero icon `40` (semantic color), heading `--font-h3 --text-primary`, subtext `--font-small --text-tertiary`, optional action button. Variants used: success "No findings" (§4.3.c), neutral "No findings match your filters" + Clear, and (rare) "No scanners available" mirror of the error.

### 5.13 Skeleton

Shimmer blocks: bg `--surface-3`, `--radius-sm`, animated gradient sweep (reduced-motion: static). Used for engine-status rows (icon 16 circle + text bars) and, if ever needed, table rows (5 bars per row). Height matches the real content line (`16`/`20`).

### 5.14 Toast

Bottom-center (mobile) / bottom-right (desktop), `z:var(--z-toast)`, `--surface`, `--shadow-lg`, `--radius-md`, `1px solid var(--border)`, `padding 10 14`, `--font-small`, leading icon. Auto-dismiss 2.5s, `role="status"` `aria-live="polite"`. Uses: "Copied file:line", "Scan cancelled", "Report downloaded" (optional). Non-blocking, max 1–2 stacked.

---

## 6. States matrix (loading / empty / error / degraded)

| Screen | Loading | Empty | Error | Degraded / partial |
|---|---|---|---|---|
| **Upload** | Engine-status panel skeleton while `GET /api/tools` loads; CTA idle | No file chosen → CTA disabled, dropzone empty state | Sync `POST /api/scan` error → inline error under dropzone (map §7); `/api/tools` fetch fail → panel info-banner "Couldn't load engine status · Retry" (scanning still allowed) | Engine panel shows missing required scanners / claude with a "coverage reduced" hint; non-blocking |
| **Scanning** | Indeterminate progress until first `progress`; spinner phase | n/a | `status:"error"` → in-card error state (icon+title+message+Start over/Try again); `404` mid-poll → "session expired" | `limits.truncated` → warning banner in card, carried to report |
| **Report** | Momentary skeleton table (data is in-memory, usually instant) | No findings → success empty state (still downloadable); filtered → "no match" + Clear | Report fetch/download failure → toast "Download failed · Retry"; missing session on download → "Session expired, re-run scan" | `summary.degraded` → header warning banner; `truncated` → second banner; skipped tools shown in context strip |

**Global:** any unexpected `INTERNAL (500)` → generic error card "Something went wrong on the server." + Start over. Never surface host paths or stack traces (SPEC invariant — server already strips them).

---

## 7. Error-code → UI copy mapping (SPEC §4.8)

Render the user-facing **title** (bold) + **message**. Use the server's
`error.message` when present; the fallbacks below guarantee friendly copy and set
the surface + retryability.

| `code` (HTTP) | Surface | Title | Fallback message | Retry? |
|---|---|---|---|---|
| `NO_FILE` (400) | Upload inline | No file selected | Choose a `.zip` to scan. | pick file |
| `NOT_A_ZIP` (415) | Upload inline | Not a .zip file | This file isn't a valid ZIP archive. | pick file |
| `UPLOAD_TOO_LARGE` (413) | Upload inline | File too large | Upload exceeds the 100 MB limit. | pick smaller |
| `VALIDATION_ERROR` (400) | Upload/inline | Invalid request | Something about the request was invalid. Try again. | retry |
| `ZIP_MALFORMED` (422) | Scanning card | Archive is corrupt | The ZIP couldn't be read. Re-export and try again. | start over |
| `EXTRACTED_TOO_LARGE` (422) | Scanning card | Archive too large | Extracted contents exceed the 512 MB limit. | start over |
| `TOO_MANY_FILES` (422) | Scanning card | Too many files | The archive exceeds the 20,000-file limit. | start over |
| `NESTING_TOO_DEEP` (422) | Scanning card | Nested archives not allowed | Remove nested archives and re-zip the project. | start over |
| `ZIP_SLIP_DETECTED` (422) | Scanning card | Unsafe archive | An entry tried to write outside the archive. Scan blocked. | start over |
| `SYMLINK_REJECTED` (422) | Scanning card | Symlinks not allowed | The archive contains symlinks, which aren't scanned. | start over |
| `COMPRESSION_RATIO_EXCEEDED` (422) | Scanning card | Possible zip bomb | Compression ratio is suspiciously high. Scan blocked. | start over |
| `SCAN_TIMEOUT` (504) | Scanning card | Scan timed out | The scan hit the {maxScanMs→180s} time budget. | try again |
| `NO_SCANNERS_AVAILABLE` (503) | Scanning card | No scanners installed | Install at least Semgrep to run a scan. See engine status. | start over |
| `SESSION_NOT_FOUND` (404) | Scanning/Report | Session expired | This scan is no longer available. Start a new one. | start over |
| `REPORT_NOT_READY` (409) | Report (download) | Report not ready | The scan is still finishing. Try the download again shortly. | retry |
| `INTERNAL` (500) | card/toast | Something went wrong | An unexpected error occurred on the server. | try again |

`toolsSkipped[].reason` friendly map: `not_installed`→"not installed", `not_applicable`→(use `detail`, e.g. "no Python project"), `timed_out`→"timed out", `errored`→"error during run", `claude-unavailable`→"not found".

---

## 8. Accessibility

- **Contrast — light theme (verified, WCAG 2.1 sRGB):** all severity solid badges ≥ 4.5:1 white text; soft badge text ≥ 5.6:1; `--text-primary` on `--surface` 17.9:1, `--text-secondary` 7.7:1, `--text-tertiary` 4.98:1 (AA for its use as meta/placeholder). Solid-fill **CTA labels** use `--on-primary`/`--on-danger` = white: primary default/hover/pressed **6.29 / 7.90 / 9.93:1**; danger default/hover/pressed (`#D92D20`/`#B42318`/`#912018`) **4.83 / 6.57 / 8.66:1** — **all ≥ 4.5 AA**.
- **Contrast — dark theme (re-verified after BUG-001 fix):** the dark accent fills are *lightened* for legibility on the dark surface, so the CTA label is the near-black **`--on-primary`/`--on-danger` = `#0A0D16`**, not white. Primary button ink-on-fill default/hover/pressed (`#818CF8` / `#A5B0FB` / `#6E78EE`) = **6.51 / 9.43 / 5.16:1**; danger button (`#FDA29B` / `#FEBCB6` / `#F98E86`) = **10.00 / 12.09 / 8.54:1** — **all ≥ 4.5 AA** (worst case 5.16). Dark severity solids keep white text on their unchanged dark fills (≥ 4.5); dark body/soft/AI-tag text all ≥ 6.8:1. *(This corrects the previous over-claim that white-on-`--primary` held in dark — white on `#818CF8` is only 2.98:1, hover 2.06, pressed 4.11, all sub-AA; hence the label ink is flipped to near-black rather than kept white.)*
- **Non-text contrast (WCAG 1.4.11) — accurate values (corrects the earlier "borders meet 3:1" over-claim):** the **focus ring** (`--primary` `#4F46E5`) is **6.29:1** on `--surface` / **5.86:1** on `--bg`, and the severity-badge borders meet 3:1 — these carry real affordance. The default **hairline borders do *not* meet 3:1** (`--border` 1.24:1, `--border-strong` 1.47:1 on `--surface`; dark 1.41 / 1.87:1) and are **exempt**: they are default/decorative boundaries, and **no interactive control relies on a border alone** — every control's presence and state is carried by fill, text, icon, and the focus ring. Any border that ever becomes the *sole* boundary of an interactive control must be darkened to ≥ 3:1.
- **Never color-alone:** severity is always icon + text label + color. Tool/category are text tags. Available/unavailable in the engine panel use distinct icons + text, not just green/grey.
- **Focus-visible:** every interactive element shows `outline: 2px solid var(--focus-ring); outline-offset: 2px` (inset `-2px` for table rows). Focus is **never** removed. Logical DOM/tab order top→bottom, left→right.
- **Touch targets:** ≥ 44×44 on mobile (buttons min-height 44, icon buttons 44, toggle row padded, table cards fully tappable). Desktop controls ≥ 32 with adequate hit padding.
- **Drawer dialog:** `role="dialog" aria-modal="true"`, labelled by the finding title, focus trap, Esc closes, focus returns to the invoking row; background inert.
- **Live regions:** scan phase announced via `aria-live="polite"` (phase stepper); report result count "Showing n of total" in a polite live region; toasts `role="status"`; hard errors `role="alert"`.
- **Table semantics:** use a real `<table>` with `<th scope="col">`, `aria-sort` on sortable headers; rows expose an accessible name and are keyboard-activatable (Enter/Space). Stacked-card mode keeps each card a labelled button.
- **Forms:** dropzone/inputs/toggle/selects have visible labels or `aria-label`; errors linked via `aria-describedby`; `aria-invalid` on failed fields.
- **Reduced motion:** honor `prefers-reduced-motion` — disable drawer slide, progress shimmer, dragover scale; keep instant state changes.
- **Zoom/reflow:** layout must not break at 200% zoom / 320px effective width; all overflow (table, code) scrolls within its own container, never the page body horizontally.

---

## 9. Developer notes, gotchas, open questions

**Build against tokens.** Emit §2 as CSS variables once; no component hard-codes a
hex, size, or radius. This is what makes light/dark and QA re-theming trivial.

**Data-mapping gotchas (from SPEC §5):**
- `Finding.file` can be **`null`** (whole-project dependency findings) and `line`
  can be `null` → Location cell shows "—"/"project", drawer shows the explicit note. Guard every `${file}:${line}`.
- `remediation` is a **single string**, not an array — the drawer's numbered-steps
  rendering is a client-side parse (split on newlines / leading enumerators). Do not
  assume structured steps.
- **AI tag logic:** "AI-identified" when `sourceTool==="claude-cli"`; "AI-enriched"
  when `enrichedByClaude===true` and tool ≠ claude. Both carry the advisory tooltip.
- `sources?` (>1) means cross-tool dedupe — show "Also reported by" + the Tool cell
  shows "N tools" with a tooltip.
- **Degraded ≠ error.** `summary.degraded===true` and claude in `toolsSkipped` are
  **normal supported states** with full results + a downloadable report — style them
  as warnings/notices, never as failures. `report.available` is `true` even when degraded.
- `limits.truncated===true` → the report is **partial**; show the truncated banner on
  both Scanning and Report.
- **Never** `dangerouslySetInnerHTML` on any API string (`description`, `remediation`,
  `codeSnippet`, `title`, `file`). Render as text; `pre-wrap` preserves author newlines.
  Code snippet is displayed escaped in a fenced block, never executed.

**Responsive contract:** verify at **375 / 768 / 1280**. Table→cards at <640;
Category column drops at <1024; drawer is a bottom sheet <768, right sheet ≥768. No
horizontal page scroll at any width (overflow lives in table/code containers).

**Polling/SSE:** baseline is `GET /api/scan/:id` @ 1000ms; SSE (`/api/scan/:id/events`)
is additive — if used, drive phase/progress/message from events and stop polling. UI
must work with polling alone.

**Open questions / judgement calls (non-blocking — flag for manager/QA if contested):**
1. **Default theme:** shipped light-primary with full dark tokens. If the team prefers
   dark-default for a security tool, only the `:root` default mapping flips — no
   component change. (Recommend: follow `prefers-color-scheme`, default light.)
2. **Cancel confirmation:** spec'd as no-confirm (single-user, cheap restart). If a
   confirm is desired, add a small popover — not blocking.
3. **Severity hue for High vs Medium:** deliberately orange-red vs dark-amber; the text
   label is the disambiguator. If QA finds them too close in soft form, bump High soft-bg
   toward `#FFEAD5`. Verified AA either way.

**Nothing here contradicts the SPEC** — no design/PRD conflict to escalate. Values are
self-derived (no Figma) and internally consistent with §4/§5/§10.
