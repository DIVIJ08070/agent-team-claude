# TEST_CASES — T7 (Pipeline + API routes + remediation `.md`, end-to-end integration)

> **BACKEND QA.** Cases derived from **SPEC §4 (API contracts), §4.7 (ScanResult
> envelope), §4.8 (errors), §5 (data model), §9 (remediation `.md`), §7.1
> (required/degraded), §8.3/§8.5 (Claude call B / degradation), §11.1–§11.3
> (no-exec, threat model, limits)** — written BEFORE reading
> `core/pipeline.ts`, `routes/{scan,report,events,upload}.ts`,
> `report/markdown.ts`, or the `index.ts` wiring. Only after this list was
> committed did I open the source (to find the DI seams / test framework — not
> to change what I test).
>
> **Host reality:** this machine has NO scanner binaries and NO `claude` CLI.
> The FULL findings path is verified deterministically via the developer's
> dependency-injection seams (fake scanners + fake claude); the REAL degraded
> path (scanner-only / NO_SCANNERS_AVAILABLE) is verified as it actually runs
> here, including a live server smoke.

## Legend
- **DI (full)** — driven through injected fake scanners + fake claude so a known
  finding set flows end-to-end deterministically.
- **HTTP** — driven against a real Fastify server (`inject` or a live loopback
  boot).
- **LIVE** — real booted server on `127.0.0.1`, real upload.

| ID | Requirement (SPEC) | Input / action | Expected |
|---|---|---|---|
| **A. Full async flow — HTTP contract (§4.1/§4.2/§4.7)** |
| TC-01 | §4.1 POST /api/scan accepts multipart `file`+`mode`, async 202 | POST multipart `file`=valid `.zip`, `mode`=`full` (DI fakes wired) | `202`; body `{scanId: UUID, status ∈ phases, createdAt: ISO}` |
| TC-02 | §4.2 poll to terminal | GET /api/scan/:scanId repeatedly | status transitions and reaches terminal `done` (not `error`); `200` throughout |
| TC-03 | §4.7 complete ScanResult envelope | inspect `result` when `done` | all required keys present: `scanId, createdAt, detection{detectedFrameworks[],primaryLanguage}, toolsRun[], toolsSkipped[], findings[], summary{bySeverity,bySource,total,enrichedByClaude,degraded,notes}, limits{maxUploadBytes,maxExtractedBytes,maxFiles,maxScanMs,truncated}, report{available,url}` |
| TC-04 | §4.7 detection block | inspect `result.detection` | `detectedFrameworks` array of `{language,framework,evidence[],confidence}`; `primaryLanguage` a Language or null |
| TC-05 | §4.7 toolsRun shape | inspect `result.toolsRun` | each `{tool, durationMs:number, findingCount:number}` (+optional version/mode); claude-cli entry present in DI-full path |
| TC-06 | §4.7 toolsSkipped w/ reasons | inspect `result.toolsSkipped` | each `{tool, reason ∈ {not_installed,not_applicable,timed_out,errored,claude-unavailable}}`, optional `detail` |
| TC-07 | §4.7 summary counts consistent | inspect `result.summary` | `total === findings.length`; `bySeverity` sums to total; `bySource` aggregates by `sourceTool`; keys are valid enums |
| TC-08 | §4.7 enrichedByClaude / degraded flags | DI-full (all required scanners fake-present + claude present) | `summary.enrichedByClaude === true`; `summary.degraded === false`; `notes` array |
| TC-09 | §4.7 report pointer | inspect `result.report` | `{available:true, url:"/api/scan/<scanId>/report.md"}` |
| TC-10 | §4.7 limits echo | inspect `result.limits` | equals config limits + `truncated:boolean` |
| **B. Full findings path via DI (§5 Finding + §8.3 enrichment)** |
| TC-11 | Known scanner findings flow through | inject fake scanners emitting a known Finding set | every injected finding surfaces in `result.findings` with §5 shape (id, severity, category, file, line, sourceTool, ruleId, title, description, remediation, references[], confidence, enrichedByClaude) |
| TC-12 | §8.3 Claude enrichment merged | fake claude call-A returns `enrichments` for a known id | matching finding has `enrichedByClaude:true` and rewritten description/remediation |
| TC-13 | §8.3 Claude newFindings appended | fake claude returns a `newFindings[]` (logic-flaw) | appended with `sourceTool:"claude-cli"`, `enrichedByClaude:true`, generated id; appears in `toolsRun` claude-cli findingCount |
| TC-14 | §8.5 mode=scanners-only skips Claude | POST with `mode=scanners-only` (claude fake present) | fake claude NEVER invoked; `enrichedByClaude:false`; claude in `toolsSkipped` (or absent from toolsRun) |
| **C. Remediation `.md` — both paths (§9, §4.5)** |
| TC-15 | §4.5 report headers | GET /api/scan/:scanId/report.md (done) | `200`; `Content-Type: text/markdown; charset=utf-8`; `Content-Disposition: attachment; filename="remediation-<scanId>.md"` |
| TC-16 | §9 deterministic header | inspect report body | `# Security Scanner — Remediation Report` + a `_Generated … STATIC analysis only (no code executed) … stack: …_` line |
| TC-17 | §9 severity summary table | inspect report body | a `## Summary` markdown table `Severity \| Count` with all 5 rows (Critical..Info) matching `summary.bySeverity` |
| TC-18 | §9 tools run / skipped lines | inspect report body | `**Tools run:** …` and `**Tools skipped:** …` reflecting toolsRun/toolsSkipped |
| TC-19 | §9 degraded banner | degraded scan | a `> ⚠️ … DEGRADED …` blockquote banner present when `summary.degraded`; absent (or non-degraded) when not |
| TC-20 | §9 per-finding numbered remediation, grouped by severity | inspect report body | findings grouped critical→info; each entry carries `file:line`, source tool(s), a numbered/concrete *what-to-change*, references |
| TC-21 | §9 AI-body path | DI-full: fake claude call-B returns markdown body | report body contains the AI-authored content, wrapped in the deterministic header+summary+footer |
| TC-22 | §9 template-only path | claude unavailable (real host / fake absent) | report still well-formed: same headings, uses each finding's `remediation` verbatim; no crash, no empty doc |
| TC-23 | §9 report ≡ ScanResult snapshot (no re-scan) | fetch report.md twice + re-poll | report reflects exactly the findings in the stored ScanResult; fetching/polling does NOT re-run the pipeline (scanner invocation count unchanged) |
| **D. mdEscape / injection-in-report safety (§9, §11.2)** |
| TC-24 | §9 malicious filename escaped | finding `file` = `` a`b|c<script> ``-style / markdown metachars | rendered escaped inline (`` ` ``,`|`,`<`,`>` neutralized) — cannot inject a table cell / HTML / new markdown structure |
| TC-25 | §9 malicious title escaped | finding `title` contains `# Injected`, `|`, backticks, HTML | escaped; does not create new headings/tables/tags in the rendered doc |
| TC-26 | §9 malicious code snippet fenced safely | `codeSnippet` contains a ```` ``` ```` run | fence backtick-run exceeds any internal run so the snippet cannot break out of its fenced block |
| **E. Error envelopes (§4.8)** |
| TC-27 | §4.8 NO_FILE | POST /api/scan multipart with no `file` field | `400`, `{error.code:"NO_FILE"}` |
| TC-28 | §4.8 NOT_A_ZIP (magic byte) | POST a file whose bytes are NOT `PK\x03\x04` | `415`, `{error.code:"NOT_A_ZIP"}` |
| TC-29 | §4.8 UPLOAD_TOO_LARGE | POST a `file` exceeding `MAX_UPLOAD_BYTES` (test w/ lowered limit) | `413`, `{error.code:"UPLOAD_TOO_LARGE"}` |
| TC-30 | §4.8 SESSION_NOT_FOUND (poll) | GET /api/scan/`<valid unknown UUID>` | `404`, `{error.code:"SESSION_NOT_FOUND"}` |
| TC-31 | §4.8 VALIDATION_ERROR (non-UUID id) | GET /api/scan/`not-a-uuid` | `400`, `{error.code:"VALIDATION_ERROR"}` |
| TC-32 | §4.8 REPORT_NOT_READY | GET report.md while job status ≠ done | `409`, `{error.code:"REPORT_NOT_READY"}` |
| TC-33 | §4.8 SESSION_NOT_FOUND (report) | GET report.md for unknown UUID | `404`, `{error.code:"SESSION_NOT_FOUND"}` |
| TC-34 | §4.8/§7.1 NO_SCANNERS_AVAILABLE | pipeline where applicable+available scanner set is empty | terminal `error` with `{code:"NO_SCANNERS_AVAILABLE"}` (HTTP 503 on a sync route) |
| TC-35 | §4.8 invariant: no host paths in errors | inspect every error envelope produced | `message`/`details` contain NO host-absolute path (`/Users/…`, `os.tmpdir()` path) |
| **F. Ephemeral + safety invariants (§5 lifecycle, §11.1/§11.3)** |
| TC-36 | §5/§11.3 workDir rm-rf'd after assembly | run a scan to done, then scan os.tmpdir() | no lingering `secscan-*` workDir for the completed scan remains |
| TC-37 | §5 session retained until TTL | after workDir gone, GET poll + report.md | still `200` (result + markdown served from the retained session object) |
| TC-38 | §11.1 STATIC-only, no execute | zip containing a hostile `package.json` postinstall + `setup.py` that writes a sentinel file | sentinel is NEVER created anywhere (nothing installed/executed) across the whole pipeline |
| TC-39 | §11.1 no-shell / argv-only | audit: pipeline/scanner spawns go through the hardened `runSubprocess` wrapper (argv, `shell:false`) | no `child_process` `exec`/`spawn(...,{shell:true})`/`eval`/`vm`/install in T7 files |
| TC-40 | §4 binds 127.0.0.1 only | boot the real server; probe listen address | listening socket is `127.0.0.1` (loopback), not `0.0.0.0`/LAN |
| **G. Real degraded path — live (host has no scanners/claude)** |
| TC-41 | §8.5/§7.1 degraded scanner-only report (npm-audit applicable) | LIVE: upload a benign JS zip WITH `package-lock.json` → poll done | `done`; `summary.degraded:true`, `enrichedByClaude:false`; scanners+claude in `toolsSkipped` w/ correct reasons; `report.available:true`; report.md template path well-formed |
| TC-42 | §7.1 NO_SCANNERS_AVAILABLE real | LIVE/DI: a project where no scanner is available+applicable | terminal error `NO_SCANNERS_AVAILABLE` (verified against real host tool absence) |
| TC-43 | LIVE end-to-end smoke | boot server on loopback, curl-upload a benign zip, poll, download report.md | full real degraded flow works end-to-end; workDir cleaned; loopback-only |

## Pass/fail rule
A case passes only if the observed HTTP status + envelope/markdown structure
matches the SPEC contract exactly. A "reasonable" deviation from the SPEC status
code or shape is a **bug**, not an accepted contract change.
