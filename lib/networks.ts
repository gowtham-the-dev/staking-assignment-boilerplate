// Backward-compatible TADA exports for legacy imports.
// Prefer lib/config for multi-chain access.

import { tadaChain } from "@/lib/config/chains";

export type TokenConfig = {
  address: `0x${string}`;
  symbol: string;
  decimals: number;
};

export const TADA_CHAIN_ID = tadaChain.id;
export const TADA_NETWORK_NAME = tadaChain.name;
export const TADA_NATIVE_SYMBOL = tadaChain.nativeSymbol;
export const TADA_RPC_URL = tadaChain.rpcUrl;
export const TADA_EXPLORER_URL = tadaChain.explorerUrl;
export const TADA_MASTERCHEF_ADDRESS = tadaChain.staking!.masterChefAddress;
export const TADA_BLOCK_TIME_SECONDS = tadaChain.blockTimeSeconds;
export const TADA_TOKENS: TokenConfig[] = tadaChain.tokens;

/** @deprecated Use per-pool depositTokenValueUnits from lib/config — kept for legacy page.tsx */
export const APR_DEPOSIT_TOKEN_VALUE = 1;
