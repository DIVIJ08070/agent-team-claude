/**
 * QA probe (T6 re-verify, item 3) — prove NO secret reaches a spawned child even
 * when secrets ARE present in the parent env at config-build time. Sets
 * ANTHROPIC_API_KEY + several arbitrary secrets BEFORE importing config, then
 * spawns a real child (`/usr/bin/env`) through the app's subprocess wrapper under
 * config.MINIMAL_ENV and inspects exactly what the child received.
 */
process.env.ANTHROPIC_API_KEY = "sk-ant-LEAK-CANARY-must-not-appear";
process.env.AWS_SECRET_ACCESS_KEY = "wJalrLEAKCANARY/must/not/appear";
process.env.GITHUB_TOKEN = "ghp_LEAKCANARYmustnotappear";
process.env.MY_RANDOM_TOKEN = "arbitrary-LEAK-CANARY";

const { config } = await import("./server/config");
const { runSubprocess } = await import("./server/util/subprocess");

async function main() {
  console.log("config.MINIMAL_ENV keys:", JSON.stringify(Object.keys(config.MINIMAL_ENV).sort()));
  const canaries = [
    "ANTHROPIC_API_KEY",
    "AWS_SECRET_ACCESS_KEY",
    "GITHUB_TOKEN",
    "MY_RANDOM_TOKEN",
    "LEAK-CANARY",
    "sk-ant-",
  ];
  const inEnvObj = canaries.filter(
    (c) => JSON.stringify(config.MINIMAL_ENV).includes(c),
  );
  console.log("canaries present in MINIMAL_ENV object:", JSON.stringify(inEnvObj), "(MUST be [])");

  // Spawn a REAL child through the hardened wrapper with the app's MINIMAL_ENV.
  const res = await runSubprocess("env", [], {
    env: config.MINIMAL_ENV,
    timeout: 10_000,
    maxBuffer: 1024 * 1024,
  });
  const childEnv = res.stdout;
  console.log("\n--- child (`env`) saw these vars ---");
  console.log(
    childEnv
      .split("\n")
      .map((l) => l.split("=")[0])
      .filter(Boolean)
      .sort()
      .join(", "),
  );
  const leaked = canaries.filter((c) => childEnv.includes(c));
  console.log("\ncanaries leaked to the spawned child:", JSON.stringify(leaked), "(MUST be [])");
  console.log(
    "VERDICT (env-security invariant):",
    inEnvObj.length === 0 && leaked.length === 0
      ? "HOLDS — no secret/API key reaches any child ✅"
      : "VIOLATED ❌",
  );
}

main().catch((e) => {
  console.error("PROBE ERROR:", e);
  process.exit(1);
});
