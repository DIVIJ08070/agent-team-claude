# TEST_CASES — T2 (BACKEND foundation)

> Derived from SPEC §2, §3, §4.6, §4.8, §5, §11.3 **before** reading the T2
> implementation. Scope = the foundation only. Sandbox/detect/scanner/claude/
> pipeline behavior (T3–T7) is explicitly **out of scope** and not tested here.
> Verdict source of truth: SPEC contracts, not the developer's description.

Evidence produced by these cases:
- `qa/test-results-T2.txt` — full runner output (Vitest suite + tsc compile-check + build).
- `qa/t2-contracts-coverage.ts` — a compile-only fixture importing every §5 type.

| ID | Requirement | Input / action | Expected |
|---|---|---|---|
| **Build health (SPEC §2, §3)** | | | |
| TC-01 | §3 one repo installs | `npm install` in `app/` | exit 0, deps resolve |
| TC-02 | §2 strict TS builds | `npm run build` (and/or `tsc --noEmit`) | exit 0, zero TS errors under `strict` |
| TC-03 | §2/§3 strict ESM tsconfig | inspect `app/tsconfig.json` | `"strict": true`; ESM module setting (`"module"` ESNext/NodeNext + `"moduleResolution"` bundler/NodeNext) |
| TC-04 | §3 scripts present | inspect `app/package.json` scripts | has `dev`, `build`, `start`, `test` |
| TC-05 | §3 vite dev proxy | inspect `app/vite.config.ts` | `/api` proxied to backend in dev |
| **Server + routes (SPEC §2.1, §4.6)** | | | |
| TC-06 | §2.1 loopback-only bind | start server; read `server/index.ts` `listen` host | binds `127.0.0.1` literally; string `0.0.0.0` never used as bind host |
| TC-07 | §4.6 health | `GET /api/health` on 127.0.0.1 | `200`, body `{ "ok": true }` |
| TC-08 | §4.6 tools shape | `GET /api/tools` | `200`; `scanners[]` each `{tool, available:boolean, version:string\|null, required:boolean}`; `claude:{available:boolean, version}`; `limits:{maxUploadBytes, maxExtractedBytes, maxFiles, maxScanMs}` |
| TC-09 | §7.1 required flags | `GET /api/tools` scanners | semgrep/osv-scanner/gitleaks `required:true`; trivy/npm-audit/pip-audit `required:false`; all 6 tools present |
| TC-10 | §11.3 tools limits values | `GET /api/tools` limits | maxUploadBytes `104857600`, maxExtractedBytes `536870912`, maxFiles `20000`, maxScanMs `180000` |
| TC-11 | §2.1 no CORS / same-origin | `GET /api/health` response headers | no `access-control-allow-origin: *` (loopback same-origin) |
| **Contracts (SPEC §5)** | | | |
| TC-12 | §5 exports every type | compile-fixture importing Severity, FindingCategory, SourceTool, Finding, Language, Framework, DetectedFramework, DetectionResult, ToolRunInfo, ToolSkipInfo, ScanSummary, EnforcedLimits, ScanResult, ErrorResponse | `tsc --noEmit` on fixture passes → all present with correct member unions |
| TC-13 | §5 importable by server AND web | fixture imports from both `server/`-relative and `web/src/`-relative path | compiles from both roots (part of TC-02 build) |
| TC-14 | §5 Finding field shape | fixture constructs a `Finding` with the exact §5 fields | typechecks (id, severity, category, file\|null, line\|null, sourceTool, ruleId\|null, title, description, remediation, references[], confidence, enrichedByClaude) |
| **Config (SPEC §11.3)** | | | |
| TC-15 | §11.3 default limits | import `server/config.ts`, read defaults | MAX_UPLOAD_BYTES 104857600, MAX_EXTRACTED_BYTES 536870912, MAX_FILES 20000, MAX_SINGLE_FILE_BYTES 52428800, MAX_COMPRESSION_RATIO 200, MAX_NESTING_DEPTH 1, MAX_SCAN_MS 180000, per-tool timeout 60000, CLAUDE_TIMEOUT_MS 90000, SESSION_TTL_MS 900000, maxBuffer 33554432, ALLOW_ONLINE_VULN_DB true |
| TC-16 | §11.3 env overrides | set `SCANNER_MAX_UPLOAD`, `SCANNER_MAX_EXTRACTED`, `SCANNER_MAX_FILES`, `SCANNER_MAX_SCAN_MS`, `SCANNER_ALLOW_ONLINE_VULN_DB`, `PORT` then load config in a child process | each override reflected in config values |
| TC-17 | §11.3 temp root | config temp root | `os.tmpdir()`-based `secscan-` prefix (not in-repo) |
| TC-18 | §8.1/§11.3 MINIMAL_ENV | inspect config `MINIMAL_ENV` | contains PATH/HOME/LANG, does NOT contain `ANTHROPIC_API_KEY` even when set in parent |
| **Subprocess hardening (SPEC §2, §7.2, §11.2)** | | | |
| TC-19 | §2 no shell | `runSubprocess` implementation | uses `spawn` with argv array; `shell` not enabled |
| TC-20 | §11.2 command-injection: literal arg | run a benign bin with arg containing `; touch pwned $(id)` metachars | arg received literally by child; no shell expansion; no `pwned` file created |
| TC-21 | §11.2 ANTHROPIC_API_KEY stripped | set `ANTHROPIC_API_KEY` in parent; child prints its env | child env has NO `ANTHROPIC_API_KEY` |
| TC-22 | §7.2/§11.2 timeout + SIGKILL group | spawn a long child (e.g. sleep 30) with short timeout | rejects/returns ~timeout; child (process group) killed, not left running |
| TC-23 | §7.2 maxBuffer cap | child emits stdout > maxBuffer | run is bounded/errors, not unbounded memory |
| **Errors (SPEC §4.8)** | | | |
| TC-24 | §4.8 envelope shape | build an `AppError` → envelope | `{ error: { code, message, details? } }` exact shape |
| TC-25 | §4.8 full code enum + status | enumerate every code | NO_FILE 400, NOT_A_ZIP 415, UPLOAD_TOO_LARGE 413, ZIP_MALFORMED 422, EXTRACTED_TOO_LARGE 422, TOO_MANY_FILES 422, NESTING_TOO_DEEP 422, ZIP_SLIP_DETECTED 422, SYMLINK_REJECTED 422, COMPRESSION_RATIO_EXCEEDED 422, SCAN_TIMEOUT 504, NO_SCANNERS_AVAILABLE 503, SESSION_NOT_FOUND 404, REPORT_NOT_READY 409, VALIDATION_ERROR 400, INTERNAL 500 |
| TC-26 | §4.8 invariant: no host path | AppError built from a message/details containing an absolute host path | envelope never emits a host-absolute filesystem path |
| **Session (SPEC §5)** | | | |
| TC-27 | §5 in-memory Map get/set | create a session, fetch by id | returns same session; unknown id → undefined |
| TC-28 | §5 TTL sweeper eviction | create session with expired `expiresAt`, run sweep | session evicted from the Map |
| TC-29 | §5 cleanup deletes workDir | create session with a real temp `workDir`, cleanup | `workDir` removed on disk; `cleanupDone` true |
| TC-30 | §5 concurrent-session cap | create > cap (default 8) sessions | oldest evicted first; size stays ≤ cap |
| **Logger + no-API-key (SPEC §2, §8, §11.2)** | | | |
| TC-31 | §11.2 redacting logger — secrets | log an object carrying a secret/token/apiKey field | secret value not emitted verbatim (redacted) |
| TC-32 | §4.8/§11.2 logger — host paths | log a host-absolute path | not leaked verbatim to client-facing output (scrubbed/redacted) |
| TC-33 | §2.1/§8/§1.4 no API key in `.env.example` | grep `app/.env.example` | no `ANTHROPIC_API_KEY` reference |
| TC-34 | §8/§11.2 no required API key in code | grep `app/**` for `ANTHROPIC_API_KEY` | only appears in strip/delete context (MINIMAL_ENV), never read as required |
