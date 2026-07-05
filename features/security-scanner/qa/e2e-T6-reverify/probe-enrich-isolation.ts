/**
 * QA probe (T6 re-verify) — characterize the REAL enrichment call (A) latency &
 * output on the actual vulnerable-app, with a GENEROUS timeout, to distinguish:
 *   (i)  Claude WOULD enrich but the 90s claudeTimeoutMs / 180s MAX_SCAN_MS cut it off
 *        (→ a timeout/latency gap), vs
 *   (ii) Claude judiciously returns nothing even when given time (→ empty-but-authored).
 * Uses the app's OWN modules end-to-end. Reads the real findings from the E2E scan.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { extractZip } from "./server/sandbox/extractZip";
import { makeTreeReadOnly } from "./server/sandbox/readonly";
import { buildFileIndex } from "./server/detect/fileIndex";
import { runClaudeEnrichment, runClaudeRemediation } from "./server/claude/enrich";
import { invokeClaude } from "./server/claude/cli";
import type { Finding } from "./shared/contracts";

const EVID =
  "/Users/divijpatel/Desktop/agent-team/features/security-scanner/qa/e2e-T6-reverify";
const LONG_TIMEOUT = 240_000; // 4 min — deliberately longer than the app's 90s cap

async function main() {
  // 1. Extract the real sample to a fresh sandbox tree (same modules the pipeline uses).
  const work = await fs.mkdtemp(path.join(os.tmpdir(), "qa-t6-enrich-"));
  const root = path.join(work, "extracted");
  await fs.mkdir(root, { recursive: true });
  const ex = await extractZip(
    "/Users/divijpatel/Desktop/agent-team/app/samples/vulnerable-app.zip",
    root,
  );
  await makeTreeReadOnly(root);
  const files = await buildFileIndex(root);
  console.log("extracted:", ex.fileCount, "files;", ex.bytesExtracted, "bytes; index size:", files.size);

  // 2. Real scanner findings from the E2E scan (drives the same enrichment input).
  const scan = JSON.parse(await fs.readFile(path.join(EVID, "scan-result.json"), "utf8"));
  const findings: Finding[] = scan.findings;
  console.log("scanner findings fed to enrichment:", findings.length);

  // 3. Call A with a GENEROUS timeout (inject a long-timeout invoke).
  const longInvoke = (prompt: string, opts: { signal?: AbortSignal }) =>
    invokeClaude(prompt, { ...opts, timeout: LONG_TIMEOUT });

  console.log("\n=== CALL A (enrich+logic) with 240s timeout — measuring real latency ===");
  const tA = Date.now();
  const enrich = await runClaudeEnrichment({
    findings,
    files,
    deps: { invoke: longInvoke },
  });
  const dA = Date.now() - tA;
  console.log("call A wall-clock:", dA, "ms  (app cap is claudeTimeoutMs=90000)");
  console.log("enrich.ok:", enrich.ok);
  console.log("enrich.toolRun:", JSON.stringify(enrich.toolRun));
  console.log("enrich.toolSkipped:", JSON.stringify(enrich.toolSkipped));
  console.log("injectionDetected:", enrich.injectionDetected);
  const enrichedCount = enrich.findings.filter((f) => f.enrichedByClaude).length;
  const newFromClaude = enrich.findings.filter((f) => f.sourceTool === "claude-cli").length;
  console.log("findings enrichedByClaude=true:", enrichedCount);
  console.log("findings sourceTool=claude-cli (new logic flaws):", newFromClaude);
  console.log(
    "VERDICT call A:",
    dA > 90_000
      ? `EXCEEDS the 90s app cap by ${Math.round((dA - 90000) / 1000)}s → real scan cuts it off (timeout gap)`
      : "within 90s cap",
    "| enrichment produced:",
    enrich.ok ? "YES (real AI content)" : "NO",
  );
  // Persist a couple of enriched examples if any.
  const sampleEnriched = enrich.findings.filter((f) => f.enrichedByClaude).slice(0, 2);
  const sampleNew = enrich.findings.filter((f) => f.sourceTool === "claude-cli").slice(0, 3);
  await fs.writeFile(
    path.join(EVID, "enrich-isolation.json"),
    JSON.stringify(
      { callAms: dA, ok: enrich.ok, enrichedCount, newFromClaude, sampleEnriched, sampleNew },
      null,
      2,
    ),
  );

  // 4. Call B (remediation) with a generous timeout too — is report.md AI-authorable?
  console.log("\n=== CALL B (remediation authoring) with 240s timeout ===");
  const tB = Date.now();
  const rem = await runClaudeRemediation({
    findings: enrich.findings,
    deps: { invoke: longInvoke },
  });
  const dB = Date.now() - tB;
  console.log("call B wall-clock:", dB, "ms");
  console.log("call B ok (markdown authored):", rem.ok);
  console.log("call B markdown length:", rem.markdown ? rem.markdown.length : 0);
  if (rem.markdown) {
    await fs.writeFile(path.join(EVID, "remediation-body-callB.md"), rem.markdown);
    console.log("first 500 chars of AI body:\n", rem.markdown.slice(0, 500));
  }
  console.log(
    "\nSUMMARY: A+B combined would need ~",
    Math.round((dA + dB) / 1000),
    "s; app budget: 90s/call, 180s/scan.",
  );

  await fs.rm(work, { recursive: true, force: true }).catch(() => {});
}

main().catch((e) => {
  console.error("PROBE ERROR:", e);
  process.exit(1);
});
