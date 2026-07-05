/**
 * QA probe (T6 re-verify, BUG-008) — money check.
 * Spawns `claude -p` through the app's OWN invokeClaude() under config.MINIMAL_ENV,
 * exactly as the pipeline does, and reports the envelope + env-security invariant.
 * This is faithful reproduction, not the developer's description.
 */
import { config } from "./server/config";
import { invokeClaude } from "./server/claude/cli";
import { extractAssistantText } from "./server/claude/parse";

function j(v: unknown) {
  return JSON.stringify(v);
}

async function main() {
  const env = config.MINIMAL_ENV as Record<string, string>;
  const keys = Object.keys(env).sort();
  console.log("=== config.MINIMAL_ENV (the ONLY env any child receives) ===");
  console.log("keys:", j(keys));
  console.log("has USER:", "USER" in env, "->", j(env.USER));
  console.log("has LOGNAME:", "LOGNAME" in env, "->", j(env.LOGNAME));
  console.log("has PATH:", "PATH" in env);
  console.log("has HOME:", "HOME" in env);
  console.log("has LANG:", "LANG" in env);
  // Env-security invariant checks (T2 must still hold after the allowlist widened)
  console.log("--- env-security invariant ---");
  console.log("has ANTHROPIC_API_KEY:", "ANTHROPIC_API_KEY" in env, "(MUST be false)");
  const secretish = keys.filter((k) =>
    /KEY|TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL|AWS|GITHUB|GH_|NPM_TOKEN|SESSION|COOKIE|PRIVATE/i.test(
      k,
    ),
  );
  console.log("secret-shaped keys in MINIMAL_ENV:", j(secretish), "(MUST be [])");
  const unexpected = keys.filter(
    (k) => !["PATH", "HOME", "USER", "LOGNAME", "LANG"].includes(k),
  );
  console.log("keys outside the 5-var allowlist:", j(unexpected), "(MUST be [])");

  console.log("\n=== MONEY CHECK: invokeClaude() under config.MINIMAL_ENV ===");
  const raw = await invokeClaude(
    "Reply with exactly the two characters: OK",
    {},
  );
  console.log("--- raw claude -p envelope (stdout) ---");
  console.log(raw);
  let parsedEnv: any = null;
  try {
    parsedEnv = JSON.parse(raw);
  } catch {
    /* not json */
  }
  console.log("--- interpretation ---");
  if (parsedEnv && typeof parsedEnv === "object") {
    console.log("is_error:", parsedEnv.is_error);
    console.log("result:", j(parsedEnv.result));
    console.log("input_tokens:", parsedEnv?.usage?.input_tokens);
    console.log("total_cost_usd:", parsedEnv.total_cost_usd);
  }
  const text = extractAssistantText(raw);
  console.log("extractAssistantText(raw):", j(text));
  const loggedIn =
    parsedEnv?.is_error === false && !/not logged in/i.test(String(parsedEnv?.result ?? ""));
  console.log(
    "\nVERDICT (money check):",
    loggedIn ? "LOGGED IN — claude fires ✅" : "NOT LOGGED IN — still broken ❌",
  );
}

main().catch((e) => {
  console.error("PROBE ERROR:", e);
  process.exit(1);
});
