# TEST_CASES — T3 Sandbox (safe zip extraction + hostile-input containment)

> Derived from SPEC §11.2 (threat model) and §11.3 (enforced limits) and §4.8
> (error-code enum) **before** reading the implementation. Each case names the
> exact SPEC error code the guard must emit. Cases marked **(QA-independent)**
> are exercised by QA-authored adversarial fixtures in `app/test/sandbox.qa.test.ts`
> (not trusting the dev-authored `sandbox.test.ts` alone).

## Threat model coverage map

| SPEC vector (§11.2) | Error code (§4.8) | Cases |
|---|---|---|
| Zip-slip / path traversal | ZIP_SLIP_DETECTED (422) | TC-01..TC-05 |
| Symlink escape | SYMLINK_REJECTED (422) | TC-06..TC-08 |
| Zip bomb (size, per-file) | EXTRACTED_TOO_LARGE (422) | TC-09 |
| Zip bomb (size, running total) | EXTRACTED_TOO_LARGE (422) | TC-10 |
| Zip bomb (ratio) | COMPRESSION_RATIO_EXCEEDED (422) | TC-11 |
| Zip bomb (count) | TOO_MANY_FILES (422) | TC-12 |
| Nested archive / depth | NESTING_TOO_DEEP (422) + opaque-blob | TC-13, TC-14 |
| Malformed / corrupt zip | ZIP_MALFORMED (422) | TC-15..TC-17 |
| Benign extract correctness | (no error) | TC-18 |
| Read-only tree | dirs 0o500 / files 0o400 | TC-19 |
| Temp dir hardening | workDir 0o700 | TC-20 |
| Guaranteed cleanup | success AND error | TC-21, TC-22 |
| No-execution invariant | no run/require/import/PATH mutation | TC-23..TC-25 |
| Limits sourced from config | not hardcoded | TC-26 |
| Host-path non-leak | archive-relative only in errors | TC-27 |

## Cases

| ID | Requirement (SPEC) | Input / action | Expected |
|---|---|---|---|
| TC-01 | §11.2 zip-slip parent traversal | zip entry `../../etc/passwd` | throws AppError code `ZIP_SLIP_DETECTED`; nothing written outside destRoot |
| TC-02 | §11.2 zip-slip deep parent | entry `a/b/../../../../tmp/evil` resolving above root | `ZIP_SLIP_DETECTED`; no file created above destRoot |
| TC-03 | §11.2 absolute-path entry | entry name `/etc/passwd` (absolute) | `ZIP_SLIP_DETECTED`; `/etc/passwd` not touched |
| TC-04 | §11.2 backslash traversal | entry `..\..\windows\system32\x` (Windows-style) | `ZIP_SLIP_DETECTED` (backslash normalized, not treated as literal filename) |
| TC-05 | §11.2 over-long / NUL / edge path | entry with NUL byte or pathological length | rejected (`ZIP_SLIP_DETECTED` or `ZIP_MALFORMED`), never written |
| TC-06 | §11.2 symlink escape | zip entry with symlink Unix mode (S_IFLNK) pointing at `/etc/passwd` | throws `SYMLINK_REJECTED`; link target NEVER materialized (no symlink, no file at dest) **(QA-independent)** |
| TC-07 | §11.2 symlink inside-root | symlink entry even pointing inside root | still `SYMLINK_REJECTED` (reject ALL symlink entries per spec) |
| TC-08 | §11.2 symlink not materialized | after TC-06 throw, assert no dangling link exists under destRoot | no link node present |
| TC-09 | §11.2/§11.3 single oversized file | one entry with uncompressedSize > MAX_SINGLE_FILE_BYTES (50 MB) | `EXTRACTED_TOO_LARGE`; aborts before/at cap, no unbounded inflation |
| TC-10 | §11.2/§11.3 running-total size | many entries each < per-file cap but sum > MAX_EXTRACTED_BYTES (512 MB) | `EXTRACTED_TOO_LARGE` on the entry that breaches the running total |
| TC-11 | §11.2/§11.3 compression ratio | entry with compressed:uncompressed ratio > 200:1 | `COMPRESSION_RATIO_EXCEEDED` **(QA-independent)** |
| TC-12 | §11.2/§11.3 file count | entry count > MAX_FILES (20 000) | `TOO_MANY_FILES` |
| TC-13 | §11.2/§11.3 nesting depth | extract invoked with depth > MAX_NESTING_DEPTH (1) | `NESTING_TOO_DEEP` |
| TC-14 | §11.2 nested archive opaque | benign zip containing an inner `.zip` | inner `.zip` written as an opaque byte blob, NOT recursed/extracted |
| TC-15 | §11.2 malformed — garbage bytes | file of random bytes (no PK header) | `ZIP_MALFORMED` |
| TC-16 | §11.2 malformed — corrupt EOCD | truncated / corrupted central directory | `ZIP_MALFORMED` |
| TC-17 | §11.2 malformed — CRC/size mismatch | entry whose stored size/CRC disagrees with data | `ZIP_MALFORMED` (or size guard), no partial-poison write escaping dest |
| TC-18 | §1/§11.2 benign extract | well-formed zip with nested dirs + files | extracts correctly; byte-content matches; fileCount/bytesExtracted accurate |
| TC-19 | §11.2/§11.3 read-only tree | after makeTreeReadOnly(root) | dirs mode `0o500`, files mode `0o400`; write to a file fails EACCES |
| TC-20 | §11.3 temp dir 0o700 | createSandbox/tempdir | workDir under os.tmpdir() with mode `0o700` |
| TC-21 | §5 cleanup on success | withSandbox resolves | workDir removed after completion |
| TC-22 | §5 cleanup on error | withSandbox body throws / extract throws | workDir removed in finally even on error path (incl. read-only tree removable) |
| TC-23 | §1/§11.1 no-execution: static scan of sandbox src | grep sandbox/*.ts for exec/spawn/execSync/require(dynamic)/import(dynamic)/child_process | ZERO subprocess or dynamic-require/import in the extraction path |
| TC-24 | §2.1 no PATH/NODE_PATH mutation | grep for process.env.PATH= / NODE_PATH / PYTHONPATH assignment | none in sandbox |
| TC-25 | §11.1 write-only-after-check | code: containment check precedes any write stream / mkdir of entry | write occurs strictly after pathGuard passes |
| TC-26 | §11.3 limits from config | grep sandbox for literal 512/50/200/20000/0o700 hardcodes vs config.limits | numeric limits reference config, not hardcoded |
| TC-27 | §4.8 host-path non-leak | AppError message/details from a slip/malformed case | contains archive-relative path only, no host-absolute workDir path |

## Execution plan

1. Run the dev-authored suite `app/test/sandbox.test.ts` (30 cases) as a baseline.
2. Add QA-independent adversarial fixtures in `app/test/sandbox.qa.test.ts`
   built from raw zip bytes (own zip byte-writer, not reusing the dev
   `zipBuilder.ts` for the security-critical cases where trusting it would be
   circular): symlink-mode entry, high-ratio entry, absolute/backslash slip,
   garbage/corrupt-EOCD, opaque nested zip, read-only + cleanup, 0o700 temp.
3. Static-audit the sandbox source for the no-execution invariant and
   config-sourced limits (TC-23..TC-26).
4. Save full runner output to `test-results-T3.txt`. PASS only if every guard
   holds with executed evidence.
