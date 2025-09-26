import { getLogger } from "../utils/logger";
import { checkAaveHealth, AAVE_SUPPORTED_CHAINS, fetchUnhealthyBorrowers } from "../protocol/aave";
import { validateEnv } from "../config";

const log = getLogger("watcher");

// Borrower list - read from env (comma-separated) or fallback to demo address
const BORROWERS = (process.env.BORROWERS || "0x0000000000000000000000000000000000000000").split(",").map(s => s.trim()).filter(Boolean);

export async function startWatcher() {
  validateEnv();
  log.info("Watcher started");
  const interval = Number(process.env.SCAN_INTERVAL_MS || "5000");

  // Continuous polling loop
  while (true) {
    for (const [chainKey, cfg] of Object.entries(AAVE_SUPPORTED_CHAINS)) {
      if (!cfg.rpcUrl) {
        log.debug({ chain: chainKey }, "Skipping chain without RPC");
        continue;
      }

  // Fetch candidates via subgraph first (fast). If no subgraph configured, skip.
      let candidates = await fetchUnhealthyBorrowers(chainKey, 10, 1000);
      if (!candidates || candidates.length === 0) {
        log.debug({ chain: chainKey }, "No unhealthy borrowers returned from subgraph, trying borrow events fallback");
        const fallback = await import("../protocol/aave");
        candidates = await fallback.fetchBorrowersByEvent(chainKey, 10, 1000);
      }
      if (!candidates || candidates.length === 0) {
        log.debug({ chain: chainKey }, "No borrowers found after fallback");
        continue;
      }

      for (const addr of candidates) {
        try {
          const health = await checkAaveHealth(addr, chainKey);
          log.info({ addr, chain: chainKey, health }, "Checked health factor");
          if (health < 1) {
            log.warn({ addr, chain: chainKey, health }, "Liquidatable position detected");
            // TODO: enqueue to executor
          }
        } catch (err) {
          log.error({ err, addr, chain: chainKey }, "Failed to check health");
        }
      }
    }

    // Sleep for interval
    await new Promise((res) => setTimeout(res, interval));
  }
}