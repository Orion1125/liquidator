import { ethers } from "ethers";
import { CHAINS } from "../config/chains";

export function getProvider(chain: keyof typeof CHAINS) {
  const url = CHAINS[chain].rpc;
  return new ethers.JsonRpcProvider(url, CHAINS[chain].chainId);
}