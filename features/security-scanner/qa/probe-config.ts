/**
 * QA probe (T2 · TC-16/17/18): imports the REAL server/config.ts in a fresh
 * process and prints the resolved values. Run once with no env (defaults) and
 * once with SCANNER_* / PORT / ANTHROPIC_API_KEY set to prove env overrides are
 * honored and the API key never enters MINIMAL_ENV.
 */
import { config } from "../../../app/server/config.ts";

process.stdout.write(
  JSON.stringify(
    {
      port: config.port,
      allowOnlineVulnDb: config.allowOnlineVulnDb,
      tempRoot: config.tempRoot,
      tempPrefix: config.tempPrefix,
      maxConcurrentSessions: config.maxConcurrentSessions,
      limits: config.limits,
      minimalEnvKeys: Object.keys(config.MINIMAL_ENV).sort(),
      minimalEnvHasApiKey: Object.prototype.hasOwnProperty.call(
        config.MINIMAL_ENV,
        "ANTHROPIC_API_KEY",
      ),
    },
    null,
    2,
  ) + "\n",
);
