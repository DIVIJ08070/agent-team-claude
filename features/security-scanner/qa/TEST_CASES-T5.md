# TEST CASES — T5 (Scanner layer SEAM 1 + Normalization SEAM 3)

> **Derived from SPEC §7 / §7.2 / §7.3 / §5 / §4.6 / §4.8 / §11 BEFORE reading the
> implementation** (QA cardinal rule). Commit under test: `4d9c301`.
> Machine has NO scanner binaries — suite must pass regardless of what is installed.
> Evidence: `test-results-T5.txt`.

## Test area A — Normalization SEAM 3: raw tool JSON → unified `Finding` (§7.3, §5)

Run each normalizer against captured fixtures in `app/test/fixtures/scanners/`.

| ID | Requirement | Input / action | Expected |
|---|---|---|---|
| TC-A01 | Semgrep normalize shape (§7.3 table) | semgrep fixture JSON → normalizer | `Finding[]`; each has `sourceTool:"semgrep"`, `ruleId`=`check_id`, `file`=`path` (archive-rel), `line`=`start.line`, `endLine`=`end.line`, `title`, `description`=`extra.message`, `category:"sast"`, `confidence` set, `enrichedByClaude:false` |
| TC-A02 | Semgrep severity band ERROR→high | semgrep result `extra.severity:"ERROR"` | `severity:"high"` (unless injection/secret rule metadata bumps to `critical`) |
| TC-A03 | Semgrep severity band WARNING→medium | `extra.severity:"WARNING"` | `severity:"medium"` |
| TC-A04 | Semgrep severity band INFO→low | `extra.severity:"INFO"` | `severity:"low"` |
| TC-A05 | Semgrep critical bump | rule metadata marking injection/secret | `severity:"critical"` for that rule class (per §7.3) |
| TC-A06 | Semgrep references merge from metadata | `extra.metadata.references` present | `references[]` populated from metadata (CWE/OWASP/rule docs) |
| TC-A07 | OSV normalize → dependency finding | osv fixture JSON | `sourceTool:"osv-scanner"`, `ruleId`=CVE/GHSA id, `category:"vulnerable-dependency"`, `file`=lockfile path, `title` includes package+version, `remediation` mentions upgrade/fixed version |
| TC-A08 | OSV CVSS → banded severity | osv finding with CVSS score | `severity` banded from CVSS (critical/high/medium/low per score bands) |
| TC-A09 | Trivy vuln normalize | trivy fixture (vuln class) | `sourceTool:"trivy"`, `category:"vulnerable-dependency"`, CVE→ruleId, CVSS→severity |
| TC-A10 | Trivy misconfig → misconfiguration category | trivy fixture misconfig class | `category:"misconfiguration"` |
| TC-A11 | gitleaks normalize → secret | gitleaks fixture JSON | `sourceTool:"gitleaks"`, `category:"secret"`, rule→ruleId, file+line set, remediation mentions remove/rotate/env |
| TC-A12 | gitleaks severity high/critical | gitleaks finding | `severity:"high"` (or `critical` for known-live-token rules), never below high |
| TC-A13 | npm-audit normalize | npm-audit fixture | `sourceTool:"npm-audit"`, `category:"vulnerable-dependency"`, advisory id→ruleId, package→title, recommended version→remediation |
| TC-A14 | pip-audit normalize | pip-audit fixture | `sourceTool:"pip-audit"`, `category:"vulnerable-dependency"`, advisory→ruleId, package→title, fix version→remediation |
| TC-A15 | Category fallback | rule w/ no CWE/OWASP metadata | `category:"other"` fallback, never crash |

## Test area B — SECURITY invariants of normalization (§7.3, §11.2, §4.8)

| ID | Requirement | Input / action | Expected |
|---|---|---|---|
| TC-B01 | **No host path leaks — archive-relative** | any fixture whose raw JSON carries an absolute host path (e.g. `/tmp/secscan-xxx/project/...`, `<root>`) | every `Finding.file` is archive-relative; NO leading `/`, no tmp/workDir prefix, no host segment anywhere in the Finding |
| TC-B02 | **Secret VALUE redaction — gitleaks** | gitleaks fixture with a `Secret`/`Match` value | the raw secret string does NOT appear anywhere in the `Finding` (title/description/remediation/codeSnippet); `codeSnippet` is `null` for secret findings |
| TC-B03 | **Secret VALUE redaction — trivy secret class** | trivy fixture secret finding | raw secret not embedded; `codeSnippet` null for secret-class finding |
| TC-B04 | Paths rewritten centrally | mixed-tool fixtures | path rewriting is enforced centrally (not per-adapter divergence); confirm even a tool that reports absolute paths yields archive-rel |
| TC-B05 | Description rendered as data | fixture description containing markdown/instructions | preserved as plain string field (no execution/interpretation at normalize time) — value present, unmodified structurally |

## Test area C — Cross-tool dedupe (§7.3)

| ID | Requirement | Input / action | Expected |
|---|---|---|---|
| TC-C01 | **Same CVE OSV+Trivy collapses to one** | two Findings same `(file,line,ruleId)` from osv-scanner + trivy | dedupe → single Finding |
| TC-C02 | Dedupe severity = max | merged pair with differing severity | resulting `severity` = the max of the two |
| TC-C03 | Dedupe references merged (union) | each source has distinct references | merged `references[]` = union (no dupes) |
| TC-C04 | Dedupe `sources[]` = union of tools | merged pair | `sources` contains both source tools (union); length>1 |
| TC-C05 | Distinct findings NOT merged | two Findings differing in ruleId or file or line | remain two separate Findings |
| TC-C06 | Fingerprint deterministic | same finding fields twice | `id = hash(sourceTool+ruleId+file+line+titleHash)` stable/equal across runs |

## Test area D — `run.ts` isolation & scanner selection (§7, §7.1) — FAKE scanners

| ID | Requirement | Input / action | Expected |
|---|---|---|---|
| TC-D01 | selectScanners filters by language | DetectionResult with only `javascript` | pip-audit (py-only) excluded; gitleaks (`*`) included; js scanners included |
| TC-D02 | selectScanners "*" always applies | any detection incl. empty langs | gitleaks (appliesTo `*`) always selected |
| TC-D03 | selectScanners python | detection python-only | pip-audit included, npm-audit (js) excluded |
| TC-D04 | Unavailable tool → toolsSkipped not_installed | fake scanner `isAvailable:false` | appears in `toolsSkipped` reason `not_installed`; run does NOT fail |
| TC-D05 | Scanner that THROWS → toolsSkipped errored | fake scanner whose `run()` throws | `toolsSkipped` reason `errored`; other scanners still run; scan succeeds |
| TC-D06 | Scanner that TIMES OUT → toolsSkipped timed_out | fake scanner exceeding deadline / abort | `toolsSkipped` reason `timed_out`; run not failed |
| TC-D07 | not_applicable → toolsSkipped | scanner returns not-applicable (e.g. npm-audit no lockfile) | `toolsSkipped` reason `not_applicable`, does not fail run |
| TC-D08 | **Empty applicable+available → NO_SCANNERS_AVAILABLE 503** | all selected scanners unavailable | throws/returns AppError `NO_SCANNERS_AVAILABLE`, httpStatus 503 |
| TC-D09 | Bounded parallelism ≤ concurrency (3) | many fake scanners recording concurrent count | peak concurrency never exceeds 3 |
| TC-D10 | Successful scanners → toolsRun + findings | mix of available fake scanners producing findings | `toolsRun[]` lists them w/ durationMs+findingCount; `findings` aggregated |
| TC-D11 | Aggregated findings are deduped | two fake scanners emitting the same CVE | `run()` output findings already cross-tool deduped |
| TC-D12 | One tool failing never drops others | one throws + one succeeds | successful tool's findings present; failing tool only in toolsSkipped |
| TC-D13 | Non-zero exit w/ valid JSON = success | (adapter behavior) scanner exits 1 but emits JSON | treated as success, not skip (per §7.2) |

## Test area E — `/api/tools` rewiring (§4.6)

| ID | Requirement | Input / action | Expected |
|---|---|---|---|
| TC-E01 | Shape unchanged | `GET /api/tools` | keys `scanners[]`, `claude`, `limits`; each scanner `{tool,available,version,required}`; claude `{available,version}`; limits `{maxUploadBytes,maxExtractedBytes,maxFiles,maxScanMs}` |
| TC-E02 | Scanner entries from registry isAvailable() | tools endpoint | the 6 scanners (semgrep/osv-scanner/gitleaks/trivy/npm-audit/pip-audit) each present with `available` sourced from the registry probe |
| TC-E03 | required flags correct | tools endpoint | semgrep/osv-scanner/gitleaks `required:true`; trivy/npm-audit/pip-audit `required:false` |
| TC-E04 | Availability honest w/o binaries | on this no-binary machine | required scanners report `available:false` gracefully (no crash), version null |
| TC-E05 | limits match config/§11.3 | tools endpoint | limit values equal config single-source values |

## Test area F — Static no-install / no-execute audit of adapters (§7.2, §11.1, §11.2)

> Static source audit + subprocess-arg assertions via fake spawn. No real binary needed.

| ID | Requirement | Check | Expected |
|---|---|---|---|
| TC-F01 | All adapters use hardened subprocess wrapper | grep adapters for `runSubprocess`/wrapper; no raw `child_process`/`exec`/`execSync`/shell | every adapter spawns via the wrapper; zero raw exec, zero `shell:true` |
| TC-F02 | Semgrep exact flags | semgrep adapter argv | contains `--config app/rules/javascript`/`--config app/rules/python` (LOCAL paths), `--json`, `--metrics=off`, `--disable-version-check`, `--no-git-ignore`, `--timeout`, `--max-target-bytes`; NO `p/` registry pack anywhere |
| TC-F03 | Semgrep rule packs are LOCAL yaml | `app/rules/javascript` + `app/rules/python` | local `.yaml` rule files exist; `--config` references local paths only, never `p/…` or a registry URL |
| TC-F04 | OSV lockfile-only, no install | osv adapter argv | `--format json`, recursive lockfile scan; no install/build flag |
| TC-F05 | gitleaks no-git + redact | gitleaks adapter argv | `detect --no-git`, `--redact`, `--report-format json`, `--exit-code 0`; report to scratch path |
| TC-F06 | Trivy offline flags | trivy adapter argv | `fs`, `--offline-scan`, `--skip-db-update`, `--format json`; no DB update / network |
| TC-F07 | npm audit package-lock-only in scratch | npm-audit adapter | `--package-lock-only --json`; runs in a SCRATCH copy dir (cwd = scratch, only package.json+lockfile copied), never the extracted root; never `npm install` |
| TC-F08 | pip-audit no-deps | pip-audit adapter argv | `-r <requirements>`, `--no-deps`, `--format json`; no install/resolve |
| TC-F09 | **cwd = scratchDir, never inside root** | every adapter's spawn options | `cwd` is a scratch dir OUTSIDE `ctx.root`; NEVER a path inside the extracted tree |
| TC-F10 | **No install/execute of project code anywhere** | static scan of `server/scanners/` | zero `npm install`/`pip install`/`setup.py`/`require(<upload>)`/`import(<upload>)`/`eval`/`vm`/build invocations |
| TC-F11 | MINIMAL_ENV strips ANTHROPIC_API_KEY | wrapper usage | adapters inherit wrapper's scrubbed env (ANTHROPIC_API_KEY stripped) — no adapter re-adds it |
| TC-F12 | Adapters never throw on tool error | (contract §7 `run()` never throws for tool-level errors) | run() returns `[]` / lets run.ts skip; confirmed by fake failure path (see D05) + static: parse failures caught |

## Pass criterion

All TCs green. Suite must pass with **no scanner binaries installed**. Any deviation
from the §4.6 shape, a host-path leak, an un-redacted secret, a missing §7.2 flag, a
scanner failure that fails the whole run, or a wrong dedupe = a bug (BUG-004+).
Contract is judged against SPEC — not the implementation's description.
