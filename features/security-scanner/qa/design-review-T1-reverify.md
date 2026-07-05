# QA DESIGN Re-verification — T1 (BUG-001 fix, QA cycle 1)

- **Mode:** DESIGN (spec re-review — no app, no screenshots).
- **Artifact reviewed:** `features/security-scanner/DESIGN_SPEC.md` (amended §2.1 / §2.3 / §2.4 / §5.1 / §8).
- **Judged against:** WCAG 2.1 sRGB contrast (independently recomputed) + SPEC §10/§4/§5 for regression.
- **Reviewer:** QA agent · **Date:** 2026-07-04
- **Prior verdict:** FAIL (cycle 0) — BUG-001, dark solid-fill CTA labels below AA.
- **This verdict:** ✅ **PASS** — BUG-001 fix verified; no regression.
- **Recompute script:** `scratchpad/contrast_reverify.py` (re-runnable; results inlined below).

---

## 1. Primary check — BUG-001 fix (independent WCAG recomputation)

The designer added per-theme `--on-primary` / `--on-danger` (white in light,
near-black `#0A0D16` in dark), lightened dark `--primary-pressed` `#6772E5`→`#6E78EE`,
and defined a dark danger button ramp `#FDA29B`/`#FEBCB6`/`#F98E86`. I recomputed
every solid-fill CTA state (primary CTAs = Start scan / Download report / Try again;
plus the danger button) in default/hover/pressed, both themes, from the raw hex —
**not** trusting the spec's numbers. Floor = 4.5:1 (AA normal text).

### Dark theme (the fix) — label = `--on-primary`/`--on-danger` `#0A0D16`

| CTA state | fill | my recompute | spec claims | AA |
|---|---|---|---|---|
| primary default | `#818CF8` | **6.51:1** | 6.51 | ✅ |
| primary hover | `#A5B0FB` | **9.43:1** | 9.43 | ✅ |
| primary pressed | `#6E78EE` | **5.16:1** | 5.16 | ✅ |
| danger default | `#FDA29B` | **10.00:1** | 10.00 | ✅ |
| danger hover | `#FEBCB6` | **12.09:1** | 12.09 | ✅ |
| danger pressed | `#F98E86` | **8.54:1** | 8.54 | ✅ |

All six exact to 2 dp. **Worst case in dark = 5.16:1** (primary pressed) — clears 4.5.

### Light theme (regression — must be unchanged) — label `#FFFFFF`

| CTA state | fill | my recompute | spec claims | AA |
|---|---|---|---|---|
| primary default/hover/pressed | `#4F46E5`/`#4338CA`/`#3730A3` | **6.29 / 7.90 / 9.93:1** | 6.29 / 7.90 / 9.93 | ✅ |
| danger default/hover/pressed | `#D92D20`/`#B42318`/`#912018` | **4.83 / 6.57 / 8.66:1** | 4.83 / 6.57 / 8.66 | ✅ |

All six exact. **Worst case overall (both themes) = 4.83:1** (light danger default) — clears 4.5.

### Old (broken) values re-confirmed as the defect that was fixed

White-on-dark-`--primary` = **2.98 / 2.06 / 4.11:1** (default/hover/pressed) — all sub-AA,
matching BUG-001. The fix correctly flips the label ink to near-black rather than keeping
white, so contrast is now carried by the label on a lightened fill (tonal button).

**BUG-001 primary check: PASS.** Every solid-fill CTA in both themes is ≥ 4.5:1.

## 2. §8 accessibility claims now match reality

- **Dark-AA claim (§8 line 599):** now states the CTA label is near-black `--on-primary`/
  `--on-danger` on the lightened fills with the exact 6.51/9.43/5.16 and 10.00/12.09/8.54
  ratios, and explicitly corrects the earlier white-on-`--primary` over-claim (2.98/2.06/4.11).
  Verified accurate against my recompute. ✅
- **Non-text border claim (§8 line 600):** now correctly states default hairlines do **not**
  meet 3:1 — `--border` **1.24:1**, `--border-strong` **1.47:1** (light), dark `--border`
  **1.41:1**, `--border-strong` **1.87:1** — and are exempt under WCAG 1.4.11 (default/
  decorative boundaries; no control relies on border alone). Focus ring `#4F46E5` = **6.29:1**
  on `--surface` / **5.86:1** on `--bg` (meets 3:1). All values recomputed and match exactly.
  The previous over-claim is corrected. ✅

## 3. Regression check — token edits broke nothing

Re-derived the previously-passing contrast set to confirm the edits introduced no new
inconsistency:

- **Severity solids (light & dark), white text:** 6.57 / 5.52 / 5.43 / 5.99 / 7.69:1 — all AA, unchanged. ✅
- **Severity soft text on soft-bg (light):** 7.18 / 6.99 / 4.78 / 5.57 / 6.98:1 — all AA, unchanged. ✅
- **Dark severity soft:** 8.35–10.56:1 — all AA. ✅
- **Dark body / semantic-soft / AI-tag text:** 16.38 / 10.35 / 6.83 (text), 9.12 / 8.96 / 8.35 (semantic soft), 8.17 (AI tag) — all AA. ✅
- **Light body text:** 17.75 / 7.69 / 4.97:1 (primary/secondary/tertiary) — all AA, unchanged. ✅

**Token-system consistency (grep-verified):**
- Old dark pressed hex `#6772E5` appears **only** in the fix note describing the change (§2.4 line 157), not as a live token — no dangling value. ✅
- `--text-inverse` (`#FFFFFF`, unchanged both themes) is now correctly scoped to **severity solids + tooltip only** (§2.1 / §2.4 / §5.11); no button references it. ✅
- `--on-primary`/`--on-danger` defined light (§2.1/§2.3), remapped dark (§2.4), referenced by §5.1 buttons and §8 — fully wired, no orphan. ✅
- §5.1 button table uses `--on-primary` for all primary states and `--on-danger` for all danger states; danger dark ramp lives in §2.4. Consistent. ✅
- Light theme (neutrals, severity, semantic, layout, components, responsive, error map, coverage) untouched by the fix — all cycle-0 passes stand. ✅

## 4. Verdict

**PASS.** BUG-001 is fixed correctly and completely: all six solid-fill CTA states clear
WCAG AA in both light and dark (worst case 4.83:1), the §8 dark-AA and non-text-border
claims now match independently-recomputed reality, and the token edits introduced no
regression or dangling reference. The design spec is now complete, exact, internally
consistent, and correct.

- **T1 → `QA_PASSED`.** Unblocks T8 (UI) alongside T7.
- **BUG-001 → `VERIFIED`** (QA-only transition; author never self-verifies).
