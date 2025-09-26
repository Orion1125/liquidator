#!/usr/bin/env ts-node
import 'dotenv/config';
import { getLogger } from '../utils/logger';
import { fetchUnhealthyBorrowers } from '../protocol/aave';

const log = getLogger('one-shot-aave-scan');

async function main() {
  const addrs = await fetchUnhealthyBorrowers('ethereum', 10, 1000);
  if (!addrs || addrs.length === 0) {
    log.info('No borrower addresses found (empty result)');
    process.exit(0);
  }
  log.info({ count: addrs.length, addrs }, 'Found borrowers');
  process.exit(0);
}

main().catch((err) => {
  console.error('one-shot scan failed', err);
  process.exit(2);
});
