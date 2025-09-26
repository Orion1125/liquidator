import dotenv from "dotenv";
import { getLogger } from "./utils/logger";
import { validateEnv } from "./config";

// load .env early so other modules see env vars
dotenv.config();

const log = getLogger("index");

async function main() {
  // validate (will assert in production)
  validateEnv();

  // dynamically import watcher after env is loaded so modules that read process.env at load time see .env
  const { startWatcher } = await import("./core/watcher");

  log.info("Starting EVM Liquidator Bot...");
  await startWatcher();
}

main().catch((err) => {
  log.error({ err }, "Fatal error");
  process.exit(1);
});