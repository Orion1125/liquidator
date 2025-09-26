import { ethers } from "ethers";
import { getLogger } from "../utils/logger";

const log = getLogger("executor");

export async function execute(tx: any, signer: ethers.Wallet) {
  try {
    const sent = await signer.sendTransaction(tx);
    log.info({ hash: sent.hash }, "Tx sent");
    await sent.wait();
    log.info("Tx confirmed");
  } catch (err) {
    log.error({ err }, "Execution failed");
  }
}