#!/usr/bin/env ts-node
import 'dotenv/config';
import { getLogger } from '../utils/logger';
import { scanOnchainUSDCBorrows, checkAaveHealth } from '../protocol/aave';

const log = getLogger('one-shot-onchain-scan');

async function main() {
  // small-window scan per user request
  const minUSDC = 1000;
  const limit = 10;
  const lookbackBlocks = parseInt(process.env.LOOKBACK || '1000', 10); // configurable via LOOKBACK env
  const chunkSize = parseInt(process.env.CHUNK_SIZE || '10', 10); // configurable via CHUNK_SIZE env

  log.info({ minUSDC, limit, lookbackBlocks }, 'Starting on-chain USDC borrow scan');
  const addrs = await scanOnchainUSDCBorrows('ethereum', minUSDC, limit, lookbackBlocks, chunkSize);
  if (!addrs || addrs.length === 0) {
    log.info('No borrowers found on-chain (empty result)');
    process.exit(0);
  }

  log.info({ count: addrs.length }, 'Found borrower addresses — checking health');
  for (const a of addrs) {
    try {
      const hf = await checkAaveHealth(a, 'ethereum', 7000);
      log.info({ address: a, healthFactor: hf }, 'user health');
    } catch (err) {
      log.warn({ address: a, err }, 'failed to fetch health');
    }
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('one-shot onchain scan failed', err);
  process.exit(2);
});
