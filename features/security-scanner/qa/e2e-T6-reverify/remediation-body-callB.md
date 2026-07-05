## Critical

### Hardcoded Stripe access token committed in `config/secrets.env`
**What's wrong:** A live Stripe access token is committed at `vulnerable-app/config/secrets.env:5` (detected by gitleaks). Anyone with repository or git-history access can call the Stripe API as your account to read payment and financial data. Because it lives in version control, deleting the line does not remove it — the value persists in history.

**What to change:**
1. Immediately revoke/rotate the token in the Stripe dashboard (Developers -> API keys -> Roll key) so the exposed value is dead before anything else.
2. Remove `config/secrets.env` from the repo and add it (and `*.env`) to `.gitignore`.
3. Load the token at runtime from an environment variable or a secret manager (HashiCorp Vault, AWS Secrets Manager) instead of a committed file.
4. Purge the value from all history with `git filter-repo` (or BFG), force-push, and have collaborators re-clone.

**References:** CWE-798 (https://cwe.mitre.org/data/definitions/798.html); Stripe key rotation (https://stripe.com/docs/keys#rolling-keys)

### OS command injection in the `/ping` route (`src/server.js:17`)
**What's wrong:** `vulnerable-app/src/server.js:17` builds a shell command by concatenating attacker-controlled `req.query.host` and passes it to `child_process.exec` (semgrep: js-child-process-command-injection). Input such as `; cat /etc/passwd` or `$(...)` executes arbitrary OS commands with the server's privileges — remote code execution.

**What to change:**
1. Replace `exec` with `execFile('ping', ['-c', '1', host])` (or `spawn` with an argument array) so no shell is invoked.
2. Validate `host` against a strict hostname/IP allowlist or regex before use and reject anything else.
3. Never interpolate user input into a shell string anywhere in the codebase.
4. Run the service under a least-privilege account to limit blast radius.

**References:** CWE-78 (https://cwe.mitre.org/data/definitions/78.html); OWASP A03:2021 Injection (https://owasp.org/Top10/A03_2021-Injection/)

### Arbitrary code execution via `eval()` in the `/calc` route (`src/server.js:26`)
**What's wrong:** `vulnerable-app/src/server.js:26` passes `req.query.expr` straight into `eval()` (semgrep: js-dangerous-eval), executing attacker-supplied JavaScript in the server process — full remote code execution and data exfiltration.

**What to change:**
1. Remove the `eval()` call entirely.
2. For arithmetic, use a safe expression evaluator such as `mathjs` or `expr-eval`, or an explicit operator allowlist.
3. For structured data, use `JSON.parse` rather than evaluating a string.
4. Never evaluate untrusted input.

**References:** CWE-95 (https://cwe.mitre.org/data/definitions/95.html); OWASP A03:2021 Injection (https://owasp.org/Top10/A03_2021-Injection/)

### `lodash@4.17.4` — prototype pollution via `defaultsDeep` (GHSA-jf85-cpcp-j695)
**What's wrong:** `lodash` 4.17.4 pinned in `vulnerable-app/package-lock.json` is vulnerable to prototype pollution: a `{constructor:{prototype:{...}}}` payload through `defaultsDeep` modifies `Object.prototype` globally, corrupting application logic and enabling downstream attacks (osv-scanner, CVE-2019-10744). Note: this app pins a single vulnerable lodash version that triggers many advisories at once — a single upgrade resolves the entire lodash cluster below.

**What to change:**
1. Upgrade `lodash` to `>= 4.17.21` (`npm install lodash@^4.17.21`); this fixes this and every other lodash advisory in this report.
2. Regenerate `package-lock.json` and redeploy.
3. Avoid deep-merging untrusted objects; validate/allowlist keys.

**References:** GHSA-jf85-cpcp-j695 (https://github.com/advisories/GHSA-jf85-cpcp-j695); CVE-2019-10744 (https://nvd.nist.gov/vuln/detail/CVE-2019-10744); CWE-1321 (https://cwe.mitre.org/data/definitions/1321.html)

### `minimist@1.2.0` — prototype pollution in `setKey()` (GHSA-xvch-5gv4-984h)
**What's wrong:** `minimist` 1.2.0 in `vulnerable-app/package-lock.json` is vulnerable to prototype pollution in `setKey()` (osv-scanner, CVE-2021-44906); attacker-controlled arguments can modify `Object.prototype` wherever argv is influenced by untrusted input.

**What to change:**
1. Upgrade `minimist` to `>= 1.2.6`.
2. Regenerate `package-lock.json`; if `minimist` is transitive, bump the parent package or add an npm `overrides`/`resolutions` entry.
3. Redeploy and re-run the scanner to confirm the advisory clears.

**References:** GHSA-xvch-5gv4-984h (https://github.com/advisories/GHSA-xvch-5gv4-984h); CVE-2021-44906 (https://nvd.nist.gov/vuln/detail/CVE-2021-44906); CWE-1321 (https://cwe.mitre.org/data/definitions/1321.html)

## High

### No authentication or authorization on any route (`src/server.js:15`)
**What's wrong:** None of the routes (`/ping`, `/calc`, `/whoami`) enforce authentication or authorization (claude-cli). Combined with the command-exec sink in `/ping` and the `eval` sink in `/calc`, any anonymous client can trigger OS command and arbitrary code execution. This broken-access-control design flaw is invisible to the pattern scanners, which only flag the injection sinks in isolation.

**What to change:**
1. Add authentication middleware (session, JWT, or API key) that runs before the route handlers.
2. Enforce per-route authorization with a deny-by-default policy.
3. Remove or tightly restrict the privileged operations (ping/calc) and run the service under a least-privilege account.

**References:** CWE-306 (https://cwe.mitre.org/data/definitions/306.html); CWE-862 (https://cwe.mitre.org/data/definitions/862.html); OWASP A01:2021 Broken Access Control (https://owasp.org/Top10/A01_2021-Broken_Access_Control/)

### `lodash@4.17.4` — command/code injection via `_.template` (GHSA-35jh-r3h4-6jhm)
**What's wrong:** `lodash` 4.17.4 in `vulnerable-app/package-lock.json` allows command/code injection through `_.template` when untrusted input reaches the template string or options (osv-scanner, CVE-2021-23337).

**What to change:**
1. Upgrade `lodash` to `>= 4.17.21` and regenerate the lockfile.
2. Never pass untrusted input to `_.template`; keep the `variable` and `imports` options developer-controlled and static.

**References:** GHSA-35jh-r3h4-6jhm (https://github.com/advisories/GHSA-35jh-r3h4-6jhm); CVE-2021-23337 (https://nvd.nist.gov/vuln/detail/CVE-2021-23337); CWE-94 (https://cwe.mitre.org/data/definitions/94.html)

### `lodash@4.17.4` — code injection via `_.template` imports key names (GHSA-r5fr-rjxr-66jc)
**What's wrong:** In `lodash` 4.17.4, `_.template` `options.imports` key names flow into the `Function()` constructor, and `assignInWith` copies polluted `Object.prototype` keys — enabling code injection (osv-scanner, CVE-2026-4800).

**What to change:**
1. Upgrade `lodash` to `>= 4.18.0` (the >= 4.17.21 upgrade above also covers this).
2. Use only developer-controlled, static key names for `options.imports`; never pass untrusted input.

**References:** GHSA-r5fr-rjxr-66jc (https://github.com/advisories/GHSA-r5fr-rjxr-66jc); CVE-2026-4800 (https://nvd.nist.gov/vuln/detail/CVE-2026-4800); CWE-94 (https://cwe.mitre.org/data/definitions/94.html)

### `lodash@4.17.4` — prototype pollution via `defaultsDeep`/`merge`/`mergeWith` (GHSA-4xc9-xhrj-v574)
**What's wrong:** `lodash` 4.17.4 is vulnerable to prototype pollution via `defaultsDeep`/`merge`/`mergeWith` using a `{constructor:{prototype:{...}}}` payload, letting an attacker add or modify properties on `Object.prototype` (osv-scanner, CVE-2018-16487).

**What to change:**
1. Upgrade `lodash` to `>= 4.17.21` and regenerate the lockfile.
2. Avoid deep-merging untrusted objects; validate and allowlist keys.

**References:** GHSA-4xc9-xhrj-v574 (https://github.com/advisories/GHSA-4xc9-xhrj-v574); CVE-2018-16487 (https://nvd.nist.gov/vuln/detail/CVE-2018-16487); CWE-1321 (https://cwe.mitre.org/data/definitions/1321.html)

### `lodash@4.17.4` — prototype pollution via `set`/`setWith`/`zipObjectDeep` (GHSA-p6mc-m468-83gw)
**What's wrong:** `lodash` 4.17.4 is vulnerable to prototype pollution via `pick`, `set`, `setWith`, `update`, `updateWith`, and `zipObjectDeep` when property identifiers are user-supplied, potentially leading to DoS or code execution (osv-scanner, CVE-2020-8203).

**What to change:**
1. Upgrade `lodash` to `>= 4.17.21` and regenerate the lockfile.
2. Do not pass user-controlled property paths to these functions.

**References:** GHSA-p6mc-m468-83gw (https://github.com/advisories/GHSA-p6mc-m468-83gw); CVE-2020-8203 (https://nvd.nist.gov/vuln/detail/CVE-2020-8203); CWE-1321 (https://cwe.mitre.org/data/definitions/1321.html)

## Medium

### Hardcoded cloud credential in `src/server.js` (`src/server.js:12`)
**What's wrong:** A cloud credential is hardcoded as a literal in `vulnerable-app/src/server.js:12` (semgrep: js-hardcoded-secret). Committed credentials are exposed to anyone with source or git-history access and cannot be rotated by configuration alone.

**What to change:**
1. Remove the literal and rotate the credential immediately at the provider.
2. Load it from `process.env` or a secret manager.
3. Scrub the value from git history (`git filter-repo`/BFG).

**References:** CWE-798 (https://cwe.mitre.org/data/definitions/798.html); OWASP A07:2021 Identification and Authentication Failures

### AWS access key ID disclosed via unauthenticated `/whoami` (`src/server.js:31`)
**What's wrong:** `GET /whoami` returns the hardcoded AWS access key ID in its JSON response to any unauthenticated caller (`vulnerable-app/src/server.js:31`, claude-cli). Returning key material through a public API leaks the identifier half of a key pair and aids credential enumeration; the secret half is hardcoded in source and also at risk. This design-level sensitive-data-exposure issue is distinct from the SAST secret finding above.

**What to change:**
1. Never return credentials or key identifiers in API responses — remove them from the `/whoami` payload.
2. Remove the key from source and load it from a secret manager.
3. Gate the endpoint behind authentication/authorization.

**References:** CWE-200 (https://cwe.mitre.org/data/definitions/200.html); CWE-798 (https://cwe.mitre.org/data/definitions/798.html); OWASP A01:2021 (https://owasp.org/Top10/A01_2021-Broken_Access_Control/)

### `express@4.16.0` — open redirect in malformed URLs (GHSA-rv95-896h-c2vc)
**What's wrong:** `express` 4.16.0 in `vulnerable-app/package-lock.json` allows malformed URLs in `res.location()`/`res.redirect()` to bypass redirect allowlists, enabling open redirect (osv-scanner, CVE-2024-29041).

**What to change:**
1. Upgrade `express` to `>= 4.20.0` (this also fixes the redirect XSS listed under Low) and regenerate the lockfile.
2. Pre-parse user-supplied URLs with `new URL()` or `node:url` before passing them to `res.location`/`res.redirect`.
3. Enforce an explicit origin allowlist for redirect targets.

**References:** GHSA-rv95-896h-c2vc (https://github.com/advisories/GHSA-rv95-896h-c2vc); CVE-2024-29041 (https://nvd.nist.gov/vuln/detail/CVE-2024-29041); CWE-601 (https://cwe.mitre.org/data/definitions/601.html)

### `lodash@4.17.4` — ReDoS in `toNumber`/`trim`/`trimEnd` (GHSA-29mw-wpgm-hmr9)
**What's wrong:** `lodash` 4.17.4 is vulnerable to ReDoS via `toNumber`, `trim`, and `trimEnd` when given very long crafted strings, allowing denial of service (osv-scanner, CVE-2020-28500).

**What to change:**
1. Upgrade `lodash` to `>= 4.17.21` and regenerate the lockfile.
2. Where practical, bound the length of user-supplied strings before passing them to lodash string helpers.

**References:** GHSA-29mw-wpgm-hmr9 (https://github.com/advisories/GHSA-29mw-wpgm-hmr9); CVE-2020-28500 (https://nvd.nist.gov/vuln/detail/CVE-2020-28500); CWE-1333 (https://cwe.mitre.org/data/definitions/1333.html)

### `lodash@4.17.4` — ReDoS in the date handler (GHSA-x5rq-j2xg-h7qm)
**What's wrong:** `lodash` 4.17.4 is vulnerable to ReDoS in the date handler when an attacker supplies very long strings matched by a regular expression (osv-scanner, CVE-2019-1010266).

**What to change:**
1. Upgrade `lodash` to `>= 4.17.21` and regenerate the lockfile.
2. Validate/limit input length before it reaches lodash.

**References:** GHSA-x5rq-j2xg-h7qm (https://github.com/advisories/GHSA-x5rq-j2xg-h7qm); CVE-2019-1010266 (https://nvd.nist.gov/vuln/detail/CVE-2019-1010266); CWE-400 (https://cwe.mitre.org/data/definitions/400.html)

### `lodash@4.17.4` — prototype pollution in `_.unset`/`_.omit` (GHSA-f23m-r3pf-42rh)
**What's wrong:** `lodash` 4.17.4 is vulnerable to prototype pollution in `_.unset` and `_.omit` via array-wrapped path segments that bypass the string-key guard, permitting deletion of built-in prototype properties (osv-scanner, CVE-2026-2950).

**What to change:**
1. Upgrade `lodash` to the fixed release (`>= 4.18.0`; the `>= 4.17.21` upgrade covers it).
2. Do not pass user-controlled paths to `_.unset`/`_.omit`.

**References:** GHSA-f23m-r3pf-42rh (https://github.com/advisories/GHSA-f23m-r3pf-42rh); CVE-2026-2950 (https://nvd.nist.gov/vuln/detail/CVE-2026-2950); CWE-1321 (https://cwe.mitre.org/data/definitions/1321.html)

### `lodash@4.17.4` — prototype pollution in `_.unset`/`_.omit` (GHSA-xxjr-mmjv-4gpg)
**What's wrong:** `lodash` 4.17.4 is vulnerable to prototype pollution in `_.unset` and `_.omit` via crafted paths that delete methods from global prototypes (osv-scanner, CVE-2025-13465).

**What to change:**
1. Upgrade `lodash` to the fixed release (`>= 4.17.23`; superseded by `>= 4.17.21`... note: use the latest patched release available for your line, and regenerate the lockfile).
2. Avoid user-controlled paths in `_.unset`/`_.omit`.

**References:** GHSA-xxjr-mmjv-4gpg (https://github.com/advisories/GHSA-xxjr-mmjv-4gpg); CVE-2025-13465 (https://nvd.nist.gov/vuln/detail/CVE-2025-13465); CWE-1321 (https://cwe.mitre.org/data/definitions/1321.html)

### `lodash@4.17.4` — prototype pollution via `__proto__` payload (GHSA-fvqr-27wr-82fm)
**What's wrong:** `lodash` 4.17.4 is vulnerable to prototype pollution via `defaultsDeep`/`merge`/`mergeWith` using a `__proto__` payload (osv-scanner, CVE-2018-3721).

**What to change:**
1. Upgrade `lodash` to `>= 4.17.21` and regenerate the lockfile.
2. Avoid merging untrusted objects and validate keys.

**References:** GHSA-fvqr-27wr-82fm (https://github.com/advisories/GHSA-fvqr-27wr-82fm); CVE-2018-3721 (https://nvd.nist.gov/vuln/detail/CVE-2018-3721); CWE-1321 (https://cwe.mitre.org/data/definitions/1321.html)

### `minimist@1.2.0` — prototype pollution via unsanitized args (GHSA-vh95-rmgr-6w4m)
**What's wrong:** `minimist` 1.2.0 is vulnerable to prototype pollution: arguments such as `--__proto__.y=Polluted` are not sanitized and modify `Object.prototype`, exploitable when an attacker controls argv (osv-scanner, CVE-2020-7598).

**What to change:**
1. Upgrade `minimist` to `>= 1.2.3` (or `>= 1.2.6` to also cover the critical `setKey` issue above) and regenerate the lockfile.
2. If transitive, bump the parent or add an `overrides`/`resolutions` entry.

**References:** GHSA-vh95-rmgr-6w4m (https://github.com/advisories/GHSA-vh95-rmgr-6w4m); CVE-2020-7598 (https://nvd.nist.gov/vuln/detail/CVE-2020-7598); CWE-1321 (https://cwe.mitre.org/data/definitions/1321.html)

## Low

### `express@4.16.0` — XSS via `response.redirect()` (GHSA-qw6h-vgh9-j6wx)
**What's wrong:** `express` 4.16.0 in `vulnerable-app/package-lock.json` is affected by an XSS issue where untrusted input passed to `response.redirect()` may lead to XSS (osv-scanner, CVE-2024-43796). Exploitation is conditional, requiring attacker-controlled redirect input plus user interaction.

**What to change:**
1. Upgrade `express` to `>= 4.20.0` and regenerate `package-lock.json` (the same upgrade fixes the Medium open-redirect finding).
2. Validate any redirect target against an explicit allowlist.

**References:** GHSA-qw6h-vgh9-j6wx (https://github.com/advisories/GHSA-qw6h-vgh9-j6wx); CVE-2024-43796 (https://nvd.nist.gov/vuln/detail/CVE-2024-43796); CWE-79 (https://cwe.mitre.org/data/definitions/79.html)

### Fragment of AWS secret access key written to startup logs (`src/server.js:34`)
**What's wrong:** At startup the app logs the first characters of the AWS secret access key (`vulnerable-app/src/server.js:34`, claude-cli). Writing any portion of a secret to stdout or log aggregation risks leaking sensitive material to logging systems and lowers the value's effective entropy.

**What to change:**
1. Remove the interpolation that logs the secret fragment.
2. Do not log secrets or any portion of them; if a startup marker is needed, log a non-sensitive constant.
3. Rotate the key if these logs may already have been shipped to a log store.

**References:** CWE-532 (https://cwe.mitre.org/data/definitions/532.html)