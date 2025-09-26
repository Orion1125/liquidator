import assert from "assert";
import dotenv from "dotenv";

dotenv.config();

export const requiredEnv = [
  // At least one RPC must be provided in production, but for local dev it's ok
  "ETHEREUM_RPC",
  "PRIVATE_KEY"
];

export function validateEnv() {
  if (process.env.NODE_ENV === "production") {
    for (const key of requiredEnv) {
      assert(process.env[key], `Missing required env var: ${key}`);
    }
  }
}
