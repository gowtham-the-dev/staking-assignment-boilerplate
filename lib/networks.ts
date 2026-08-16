// Network config. One EVM testnet: TADA (balances + staking).
// This file is intentionally just a bag of constants.

export const TADA_CHAIN_ID = 31451;
export const TADA_NETWORK_NAME = "TADA Protocol Testnet";
export const TADA_NATIVE_SYMBOL = "TADA";
export const TADA_RPC_URL =
  process.env.NEXT_PUBLIC_TADA_RPC_URL ??
  "https://full.tada-protocol-testnet.xyz/jsonrpc";
export const TADA_EXPLORER_URL =
  process.env.NEXT_PUBLIC_TADA_EXPLORER_URL ??
  "https://blockscout.tada-protocol-testnet.xyz";
export const TADA_MASTERCHEF_ADDRESS =
  (process.env.NEXT_PUBLIC_TADA_MASTERCHEF_ADDRESS as `0x${string}`) ??
  "0x911843299861A4db1F6390184BbC54D203E50a9B";
export const TADA_BLOCK_TIME_SECONDS = 1;

export type TokenConfig = {
  address: `0x${string}`;
  symbol: string;
  decimals: number;
};

export const TADA_TOKENS: TokenConfig[] = [
  {
    address: "0xa9728bf6a4cb2646e4E6E6B074CCc5305DBC904f",
    symbol: "A_MVL",
    decimals: 18,
  },
  {
    address: "0x8999b932877c854df9Ce4EEC737cb0CdFEC48A18",
    symbol: "B_MVL",
    decimals: 18,
  },
];

// Quick placeholder: treats every deposit token as equal to the reward token.
// This makes pool1 (B_MVL deposit / A_MVL reward) look like 1:1.
export const APR_DEPOSIT_TOKEN_VALUE = 1;
