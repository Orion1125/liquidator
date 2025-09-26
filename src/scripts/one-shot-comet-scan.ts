import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { ethers } from 'ethers';

dotenv.config();

const DEFAULT_RPC = process.env.COMET_RPC || process.env.ETHEREUM_RPC || process.env.ALCHEMY_MAINNET_RPC || process.env.PROVIDER_URL || 'https://cloudflare-eth.com';
const ROOTS_PATH = process.env.COMET_ROOTS_PATH || path.join('comet', 'deployments', 'mainnet', 'usdc', 'roots.json');
const LOOKBACK_BLOCKS = Number(process.env.COMET_LOOKBACK_BLOCKS || '1000');
const CHUNK_SIZE = Number(process.env.COMET_CHUNK_SIZE || '10');
const LIMIT = Number(process.env.COMET_LIMIT || '10');
const POLITE_DELAY_MS = Number(process.env.COMET_POLITE_DELAY_MS || '150');

const COMET_ABI = [
  'function isLiquidatable(address) view returns (bool)',
  'event Withdraw(address indexed src, address indexed to, uint256 amount)'
];

async function readCometAddress(): Promise<string> {
  const abs = path.resolve(ROOTS_PATH);
  if (!fs.existsSync(abs)) throw new Error(`Comet roots file not found: ${abs}`);
  const raw = fs.readFileSync(abs, 'utf8');
  const json = JSON.parse(raw);
  if (!json.comet) throw new Error(`no "comet" key found in ${abs}`);
  return (json.comet as string).toLowerCase();
}

async function sleep(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function scanWithdrawEvents(contract: ethers.Contract, provider: ethers.Provider, lookback: number, chunkSize: number) {
  const endBlock = await provider.getBlockNumber();
  const startBlock = Math.max(0, endBlock - lookback);
  const unique = new Set<string>();

  for (let from = startBlock; from <= endBlock; from += chunkSize) {
    const to = Math.min(endBlock, from + chunkSize - 1);
    try {
      const events = await contract.queryFilter(contract.filters.Withdraw(), from, to);
      for (const ev of events) {
        try {
          const anyEv: any = ev as any;
          const src = (anyEv.args && anyEv.args.src) ? (anyEv.args.src as string).toLowerCase() : undefined;
          if (src) unique.add(src);
        } catch (e) {
          // ignore parse errors
        }
      }
    } catch (e: any) {
      console.error(`chunk ${from}-${to} failed: ${e.message || e}`);
    }
    // be polite to rate-limited providers
    await sleep(POLITE_DELAY_MS);
  }

  return Array.from(unique);
}

async function main() {
  console.log('Comet one-shot scanner starting');
  // Try RPCs from env in order until we find one that responds
  const candidateRpcs = [
    process.env.COMET_RPC,
    process.env.ETHEREUM_RPC,
    process.env.ALCHEMY_MAINNET_RPC,
    process.env.PROVIDER_URL,
    process.env.ALCHEMY_KEY && `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
    'https://cloudflare-eth.com',
    'https://ethereum.publicnode.com'
  ].filter(Boolean) as string[];

  let provider: ethers.JsonRpcProvider | null = null;
  let usedRpc: string | null = null;

  for (const candidate of candidateRpcs) {
    try {
      const p = new ethers.JsonRpcProvider(candidate);
      // quick sanity check
      await p.getBlockNumber();
      provider = p;
      usedRpc = candidate;
      break;
    } catch (e: any) {
      console.warn(`rpc ${candidate} failed: ${e.message || e}`);
    }
  }

  if (!provider || !usedRpc) {
    throw new Error('No working RPC found in environment');
  }

  console.log('using rpc:', usedRpc);
  const cometAddress = await readCometAddress();
  console.log('comet address:', cometAddress);

  const contract = new ethers.Contract(cometAddress, COMET_ABI, provider as any);

  console.log(`scanning last ${LOOKBACK_BLOCKS} blocks in chunks of ${CHUNK_SIZE} for Withdraw events...`);
  const candidates = await scanWithdrawEvents(contract, provider, LOOKBACK_BLOCKS, CHUNK_SIZE);
  console.log(`found ${candidates.length} unique candidate addresses (capped to ${LIMIT})`);

  let found = 0;
  for (const addr of candidates) {
    if (found >= LIMIT) break;
    try {
      const ok: boolean = await contract.isLiquidatable(addr);
      console.log(`${addr} isLiquidatable=${ok}`);
      if (ok) found += 1;
    } catch (e: any) {
      console.error(`isLiquidatable(${addr}) failed: ${e.message || e}`);
    }
    // small pause between RPC calls
    await sleep(50);
  }

  console.log('done');
}

main().catch(err => { console.error('fatal:', err); process.exit(1); });
