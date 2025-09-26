// src/protocol/aave.ts
import type { ChainConfig } from "../types.ts";
import { ethers } from "ethers";
import axios from "axios";
import { getLogger } from "../utils/logger";

const log = getLogger("aave");

export const AAVE_SUPPORTED_CHAINS: Record<string, ChainConfig> = {
  ethereum: {
    name: "Ethereum",
    chainId: 1,
    rpcUrl: process.env.ETHEREUM_RPC!,
    lendingPool: "0x7BeA39867e4169DBe237d55C8242a8f2fcdcc387", // Aave v3 pool
    protocol: "aave",
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    rpcUrl: process.env.POLYGON_RPC!,
    lendingPool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD", // Aave v3 pool
    protocol: "aave",
  },
  avalanche: {
    name: "Avalanche",
    chainId: 43114,
    rpcUrl: process.env.AVALANCHE_RPC!,
    lendingPool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD", // Aave v3 pool
    protocol: "aave",
  },
  arbitrum: {
    name: "Arbitrum",
    chainId: 42161,
    rpcUrl: process.env.ARBITRUM_RPC!,
    lendingPool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD", // Aave v3 pool
    protocol: "aave",
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpcUrl: process.env.OPTIMISM_RPC!,
    lendingPool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD", // Aave v3 pool
    protocol: "aave",
  },
  base: {
    name: "Base",
    chainId: 8453,
    rpcUrl: process.env.BASE_RPC!,
    lendingPool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD", // Aave v3 pool
    protocol: "aave",
  },
  bnb: {
    name: "BNB Chain",
    chainId: 56,
    rpcUrl: process.env.BNB_RPC!,
    lendingPool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD", // Aave v3 pool
    protocol: "aave",
  },
  scroll: {
    name: "Scroll",
    chainId: 534352,
    rpcUrl: process.env.SCROLL_RPC!,
    lendingPool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD", // Aave v3 pool
    protocol: "aave",
  },
};

// Minimal health check: for demonstration we query aave v3 data provider if available.
// In production use Aave's subgraph or official SDK for robust data.
export async function checkAaveHealth(address: string, chainKey = "ethereum", timeoutMs = 5000) {
  const cfg = AAVE_SUPPORTED_CHAINS[chainKey];
  if (!cfg) throw new Error(`unsupported chain ${chainKey}`);
  if (!cfg.rpcUrl) throw new Error(`no RPC for chain ${chainKey}`);
  const provider = new ethers.JsonRpcProvider(cfg.rpcUrl);

  // Aave LendingPool (V2/V3) exposes getUserAccountData which returns healthFactor
  const abi = [
    "function getUserAccountData(address user) view returns (uint256 totalCollateralETH, uint256 totalDebtETH, uint256 availableBorrowsETH, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)"
  ];

  try {
    const lp = new ethers.Contract(cfg.lendingPool!, abi, provider);
    const dataPromise = lp.getUserAccountData(address);
    const timeoutPromise = new Promise((_res, rej) => setTimeout(() => rej(new Error("getUserAccountData timeout")), timeoutMs));
    const data = await Promise.race([dataPromise, timeoutPromise]) as any;

    const hf = data?.healthFactor ?? data[5];
    const hfNum = Number(hf) / 1e18; // healthFactor has 18 decimals
    return hfNum;
  } catch (err) {
    log.warn({ err, address, chain: chainKey }, "checkAaveHealth failed");
    throw new Error(`failed to check health: ${(err as Error).message}`);
  }
}

// Fetch borrowers with unhealthy positions from a Graph subgraph.
// Env var convention: <CHAIN_UPPER>_AAVE_SUBGRAPH, e.g. ETHEREUM_AAVE_SUBGRAPH
export async function fetchUnhealthyBorrowers(chainKey = "ethereum", limit = 100, minBorrowUsd = 0): Promise<string[]> {
  const envName = `${chainKey.toUpperCase()}_AAVE_SUBGRAPH`;
  // Prefer a generic AAVE_GRAPHQL or chain-specific AAVE_ETHEREUM_SUBGRAPH if present, otherwise fallback to the chain-specific var
  const url = process.env.AAVE_GRAPHQL || process.env.AAVE_ETHEREUM_SUBGRAPH || process.env[envName];
  if (!url) return [];
  if (process.env.NODE_ENV !== 'production') log.debug({ chain: chainKey, url }, 'using subgraph URL');

  const cfg = AAVE_SUPPORTED_CHAINS[chainKey];
  if (!cfg) return [];

  // First, fetch markets so we can query userBorrows per market (Aave v3 requires markets input)
  try {
    const marketsQuery = `{ markets { id symbol underlyingAsset underlyingAssetSymbol } }`;
    const marketsResp = await axios.post(url, { query: marketsQuery }, { timeout: 5000 });
    let markets = marketsResp.data?.data?.markets || [];
    // If endpoint returns an error message indicating the subgraph was removed,
    // fall back to a curated small list of common Ethereum markets.
    if ((!Array.isArray(markets) || markets.length === 0) && marketsResp.data?.errors) {
      if (process.env.NODE_ENV !== 'production') log.debug({ chain: chainKey, resp: marketsResp.data }, 'no markets returned');
      // curated fallback markets (common mainnet assets) — addresses or ids may be accepted by different v3 variants
      markets = [
        { id: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH', underlyingAsset: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },
        { id: '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', symbol: 'USDC', underlyingAsset: '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' },
        { id: '0x6B175474E89094C44Da98b954EedeAC495271d0F', symbol: 'DAI', underlyingAsset: '0x6B175474E89094C44Da98b954EedeAC495271d0F' },
      ];
    }
    if (!Array.isArray(markets) || markets.length === 0) {
      if (process.env.NODE_ENV !== 'production') log.debug({ chain: chainKey, resp: marketsResp.data }, 'no markets returned');
      return [];
    }

    const usersSet = new Set<string>();
    const perMarketLimit = Math.max(1, Math.floor(limit / Math.min(markets.length, 10)));

    const v3Query = `query userBorrows($request: UserBorrowsRequest!) { userBorrows(request: $request) { items { user { id } amountUSD healthFactor } } }`;

    // Try several request shapes to handle slightly-different v3 schemas.
    for (const m of markets.slice(0, 10)) {
      // prefer underlyingAsset if available, otherwise fall back to market id
      const marketAddress = (m.underlyingAsset || m.id || '').toString();

      const attemptShapes = [
        // shape A: markets with address + chainId, orderBy + where
        {
          query: v3Query,
          variables: {
            request: {
              markets: [{ address: marketAddress, chainId: cfg.chainId }],
              where: { totalBorrowsUSD_gte: String(minBorrowUsd), healthFactor_lt: "1" },
              pagination: { limit: perMarketLimit },
              orderBy: { orderBy: "amountUSD", orderDirection: "desc" }
            }
          }
        },
        // shape B: markets as ids (some forks use market id)
        {
          query: v3Query,
          variables: {
            request: {
              markets: [marketAddress],
              where: { totalBorrowsUSD_gte: String(minBorrowUsd), healthFactor_lt: "1" },
              pagination: { limit: perMarketLimit }
            }
          }
        },
        // shape C: include user null to see if schema accepts it (some require a user field)
        {
          query: v3Query,
          variables: {
            request: {
              markets: [{ address: marketAddress, chainId: cfg.chainId }],
              user: null,
              where: { totalBorrowsUSD_gte: String(minBorrowUsd), healthFactor_lt: "1" },
              pagination: { limit: perMarketLimit }
            }
          }
        }
      ];

      let succeeded = false;
      for (const req of attemptShapes) {
        try {
          const resp = await axios.post(url, req, { timeout: 5000 });
          if (process.env.NODE_ENV !== 'production') log.debug({ chain: chainKey, market: marketAddress, resp: resp.data }, 'market userBorrows response');
          if (resp.data?.errors) {
            // log and continue to next shape
            if (process.env.NODE_ENV !== 'production') log.debug({ chain: chainKey, market: marketAddress, errors: resp.data.errors }, 'v3 request errors');
            continue;
          }
          const items = resp.data?.data?.userBorrows?.items || [];
          for (const it of items) {
            const id = (it.user?.id || it.id || '').toLowerCase();
            if (id) usersSet.add(id);
            if (usersSet.size >= limit) break;
          }
          succeeded = true;
          if (usersSet.size >= limit) break;
          if (succeeded) break;
        } catch (err: any) {
          // log and try next shape
          if (process.env.NODE_ENV !== 'production') log.debug({ err: (err as Error).message, chain: chainKey, market: marketAddress }, 'userBorrows request failed for market');
        }
      }
      if (usersSet.size >= limit) break;
    }

    return Array.from(usersSet).slice(0, limit);
  } catch (err: any) {
    log.debug({ err, chain: chainKey }, 'fetchUnhealthyBorrowers failed');
    return [];
  }
}

// Fallback: query recent borrow events to find borrowers with large borrows
export async function fetchBorrowersByEvent(chainKey = "ethereum", limit = 10, minBorrowUsd = 1000): Promise<string[]> {
  const envName = `${chainKey.toUpperCase()}_AAVE_SUBGRAPH`;
  const url = process.env[envName];
  if (!url) return [];

  const query = `query borrows($request: BorrowRequest!) { borrow(request: $request) { items { user amountUSD } } }`;
  const req = { query, variables: { request: { where: { amountUSD_gte: String(minBorrowUsd) }, pagination: { limit } } } };
  try {
    const resp = await axios.post(url, req, { timeout: 5000 });
    if (process.env.NODE_ENV !== 'production') log.debug({ chain: chainKey, resp: resp.data }, 'borrow events response');
    const items = resp.data?.data?.borrow?.items || [];
    const set = new Set<string>();
    for (const it of items) {
      const id = (it.user || it.id || '').toLowerCase();
      if (id) set.add(id);
    }
    return Array.from(set).slice(0, limit);
  } catch (err: any) {
    log.debug({ err, chain: chainKey }, 'borrow events request failed');
    return [];
  }
}

// On-chain scanner: look for Borrow events from lendingPool where reserve == USDC and amount >= minUSDC
export const USDC_ADDRESSES: Record<string, string> = {
  ethereum: "0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  polygon: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
};

export async function scanOnchainUSDCBorrows(chainKey = "ethereum", minUSDC = 1000, limit = 10, lookbackBlocks = 200000, chunkSize = 1000): Promise<string[]> {
  const cfg = AAVE_SUPPORTED_CHAINS[chainKey];
  if (!cfg?.rpcUrl || !cfg?.lendingPool) return [];
  const usdc = USDC_ADDRESSES[chainKey];
  if (!usdc) return [];

  const provider = new ethers.JsonRpcProvider(cfg.rpcUrl);
  const iface = new ethers.Interface(["event Borrow(address indexed reserve, address user, address indexed onBehalfOf, uint256 amount, uint256 borrowRateMode, uint256 borrowRate, uint16 referral)"]);
  try {
    const current = await provider.getBlockNumber();
    const from = Math.max(0, current - lookbackBlocks);
  // Compute topic for Borrow event via keccak256(signature)
  const sig = "Borrow(address,address,address,uint256,uint256,uint256,uint16)";
  const topic = ethers.keccak256(ethers.toUtf8Bytes(sig));
    const lpAddress = String(cfg.lendingPool).toLowerCase();
    const users = new Set<string>();

    // chunk the block range into small windows to avoid provider limits (e.g., Alchemy free-tier)
    for (let start = from; start <= current; start += chunkSize) {
      const end = Math.min(start + chunkSize - 1, current);
      try {
        const logs = await provider.getLogs({ address: lpAddress, fromBlock: start, toBlock: end, topics: [topic] });
        for (const l of logs.reverse()) { // newest first within chunk
          try {
            const parsed = iface.parseLog(l);
            if (!parsed) continue;
            const reserve = String(parsed.args[0]).toLowerCase();
            const user = String(parsed.args[1]).toLowerCase();
            const amount = BigInt(String(parsed.args[3]));
            // check reserve equals USDC address
            if (reserve !== usdc.toLowerCase()) continue;
            // USDC typically has 6 decimals
            const minAmount = BigInt(minUSDC) * 1000000n;
            if (amount >= minAmount) {
              users.add(user);
              if (users.size >= limit) break;
            }
          } catch (err) {
            // ignore parse errors per-log
          }
        }
      } catch (err: any) {
        // provider may enforce very small ranges; log and continue
        if (process.env.NODE_ENV !== 'production') log.debug({ err: (err as Error).message, chain: chainKey, start, end }, 'getLogs chunk failed');
      }
      if (users.size >= limit) break;
      // small delay to be polite to provider
      await new Promise((res) => setTimeout(res, 150));
    }
    return Array.from(users).slice(0, limit);
  } catch (err) {
    log.debug({ err, chain: chainKey }, 'on-chain borrow scan failed');
    return [];
  }
}