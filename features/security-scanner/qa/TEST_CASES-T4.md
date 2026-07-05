# TEST_CASES — T4 Framework detection (SEAM 2)

> Cases derived from **SPEC §6** (framework detection, `FileIndex`, marker→framework
> map, confidence rule, safety invariants) and §5 (`DetectionResult`/`DetectedFramework`
> contracts) **before reading the implementation**. Each TC is automated in
> `app/test/detect.qa.test.ts` (independent QA suite) unless noted as covered by
> executing the dev suite `app/test/detect.test.ts`.

## A. FileIndex (`detect/fileIndex.ts`)

| ID | Requirement (SPEC §6) | Input / action | Expected |
|---|---|---|---|
| TC-01 | `FileIndex.files` = relative paths + sizes, single walk | Build index over a nested project | every entry `{rel, sizeBytes}`; `rel` is **POSIX** (`/`), relative to root, never absolute, no `./` prefix; `sizeBytes` matches real file size |
| TC-02 | `has(rel)` membership | `has("package.json")` vs `has("nope.json")` | `true` for a present file, `false` for absent |
| TC-03 | `read(rel, maxBytes)` returns content, size-capped | read a small manifest with generous cap | returns file text (string) |
| TC-04 | `read()` is size-capped | read a file with `maxBytes` smaller than the file | returns `null` OR a string truncated to ≤ maxBytes — never the full oversized content (does not throw) |
| TC-05 | Oversized manifest (>2 MB) → null, not thrown | `read()` a >2MB file with a >2MB cap (or via detector) | oversized manifest treated as unreadable → `null`, no throw |
| TC-06 | Path traversal rejected | `read("../secret")` / `read("a/../../x")` | `null`, no throw, no escape read |
| TC-07 | Absolute path rejected | `read("/etc/passwd")` | `null`, no throw |
| TC-08 | Missing file | `read("does/not/exist")` | `null`, no throw |
| TC-09 | Symlinks NOT followed during walk | project dir containing a symlink to an out-of-tree file/dir | symlink target contents NOT indexed / walk does not traverse the link |
| TC-10 | `truncated` set at maxFiles cap | index a tree exceeding the `maxFiles` cap | `FileIndex.truncated === true`; walk stops at cap (no unbounded walk) |
| TC-11 | Below cap not truncated | small tree | `truncated === false` |

## B. Node detector (`detectors/node.ts`)

| ID | Requirement | Input / action | Expected |
|---|---|---|---|
| TC-20 | `package.json` present → `node` | node project w/ package.json | includes `{language:"javascript", framework:"node"}` |
| TC-21 | `next` (+react) declared → high | deps `{next, react}` | `next` framework `confidence:"high"` AND `react` present; evidence cites `package.json` |
| TC-22 | `express` declared → high | dep `express` | `express` framework `confidence:"high"` |
| TC-23 | `react` declared → high | dep `react`/`react-dom` | `react` framework `confidence:"high"` |
| TC-24 | TypeScript recorded as evidence | tsconfig.json or `.ts`/`.tsx` present | a TS evidence string recorded on the node/js detection |
| TC-25 | Lockfile recorded as evidence | `package-lock.json`/`yarn.lock`/`pnpm-lock.yaml` present | lockfile evidence string recorded |
| TC-26 | Medium node from `.js` when no package.json | dir with `.js` files, no manifest | `node`/js `confidence:"medium"` (inferred from extension) |
| TC-27 | Confidence rule: declared=high, inferred=medium | compare TC-22 vs TC-26 | declared dep → high; extension-only → medium |

## C. Python detector (`detectors/python.ts`)

| ID | Requirement | Input / action | Expected |
|---|---|---|---|
| TC-40 | requirements/pyproject/Pipfile → `python` | any python manifest | includes `{language:"python", framework:"python"}` |
| TC-41 | django high (manage.py / Django dep) | `manage.py` present or `Django` in requirements | `django` `confidence:"high"` |
| TC-42 | flask high | `Flask` in requirements | `flask` `confidence:"high"` |
| TC-43 | fastapi high via light TOML/text scan (NOT executed) | `fastapi`/`uvicorn` in pyproject.toml/requirements | `fastapi` `confidence:"high"`; parsed as text, not executed |
| TC-44 | Medium python from `.py` when no manifest | dir with `.py` files, no manifest | `python` `confidence:"medium"` |

## D. Registry aggregation (`registry.ts` / `merge.ts`)

| ID | Requirement | Input / action | Expected |
|---|---|---|---|
| TC-60 | `runDetection` aggregates all detectors | polyglot dir (node + python) | frameworks from BOTH languages present |
| TC-61 | `primaryLanguage` on polyglot dir | polyglot dir | `primaryLanguage` is a single deterministic `Language` (weighted by confidence/signal), non-null |
| TC-62 | `primaryLanguage` single-language | node-only project | `primaryLanguage === "javascript"` |
| TC-63 | Result shape matches §5 `DetectionResult` | any project | `{detectedFrameworks: DetectedFramework[], primaryLanguage}`; each framework has `language, framework, evidence[], confidence` |

## E. Safety / degradation (SPEC §6, §1.2 G1)

| ID | Requirement | Input / action | Expected |
|---|---|---|---|
| TC-80 | Malformed manifest does NOT throw | invalid JSON `package.json` | detection resolves; degrades to unknown/marker-only (`node` from marker, no dep frameworks); no throw |
| TC-81 | Empty project → [] + null primary | empty dir | `detectedFrameworks === []`, `primaryLanguage === null` |
| TC-82 | Never executes/imports/installs uploaded content | malicious `package.json` w/ scripts; `setup.py` w/ code | detection reads only allowlisted manifests as data; no child process / no import of project code (static-only) |
| TC-83 | Oversized manifest degrades (no throw) | >2MB package.json | degrades to marker-only `node`, no dep parse, no throw |
| TC-84 | Only small allowlisted manifests read | project with large non-manifest files | detection does not read arbitrary large files as manifests |

## F. Execute dev suite

| ID | Requirement | Input / action | Expected |
|---|---|---|---|
| TC-90 | Dev suite `detect.test.ts` executes green | `vitest run test/detect.test.ts` | all dev cases pass (baseline) |
</content>
</invoke>
