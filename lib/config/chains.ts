import type { Address } from "viem";

export type TokenConfig = {
  address: Address;
  symbol: string;
  decimals: number;
};

/** Per-pool APR assumptions and UI metadata. Deposit/reward values are fixed price units. */
export type PoolConfig = {
  pid: number;
  label: string;
  depositTokenValueUnits: number;
  rewardTokenValueUnits: number;
};

export type StakingConfig = {
  masterChefAddress: Address;
  rewardTokenAddress: Address;
  pools: PoolConfig[];
  defaultPoolId: number;
};

export type ChainDefinition = {
  id: number;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeSymbol: string;
  nativeDecimals: number;
  blockTimeSeconds: number;
  tokens: TokenConfig[];
  staking?: StakingConfig;
};

function envString(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function envNumber(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function envAddress(key: string, fallback: Address): Address {
  const raw = process.env[key];
  return (raw as Address | undefined) ?? fallback;
}

const TADA_A_MVL = envAddress(
  "NEXT_PUBLIC_TADA_STAKING_TOKEN_ADDRESS",
  "0xa9728bf6a4cb2646e4E6E6B074CCc5305DBC904f",
);
const TADA_B_MVL = envAddress(
  "NEXT_PUBLIC_TADA_STAKING_TOKEN_ADDRESS_B",
  "0x8999b932877c854df9Ce4EEC737cb0CdFEC48A18",
);

const MVL_A_MVL = envAddress(
  "NEXT_PUBLIC_MVL_STAKING_TOKEN_ADDRESS",
  "0x26DDd3895Ef88918Ca24638B3338aA59181304f2",
);
const MVL_B_MVL = envAddress(
  "NEXT_PUBLIC_MVL_STAKING_TOKEN_ADDRESS_B",
  "0xbC1085FC360467FCebd4C24c628F061140a6Ad32",
);

const SEPOLIA_MVL = envAddress(
  "NEXT_PUBLIC_SEPOLIA_MVL_TOKEN_ADDRESS",
  "0x3cf4ccf7Ec4Bb094d1504D1315057A46005d5065",
);
const SEPOLIA_USDC = envAddress(
  "NEXT_PUBLIC_SEPOLIA_USDC_TOKEN_ADDRESS",
  "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
);

const DEFAULT_STAKING_POOLS: PoolConfig[] = [
  { pid: 0, label: "Pool 0", depositTokenValueUnits: 1, rewardTokenValueUnits: 1 },
  { pid: 1, label: "Pool 1", depositTokenValueUnits: 2, rewardTokenValueUnits: 1 },
];

export const tadaChain: ChainDefinition = {
  id: envNumber("NEXT_PUBLIC_TADA_CHAIN_ID", 31451),
  name: "TADA Protocol Testnet",
  rpcUrl: envString(
    "NEXT_PUBLIC_TADA_RPC_URL",
    "https://full.tada-protocol-testnet.xyz/jsonrpc",
  ),
  explorerUrl: envString(
    "NEXT_PUBLIC_TADA_EXPLORER_URL",
    "https://blockscout.tada-protocol-testnet.xyz",
  ),
  nativeSymbol: "TADA",
  nativeDecimals: 18,
  blockTimeSeconds: envNumber("NEXT_PUBLIC_TADA_BLOCK_TIME_SECONDS", 1),
  tokens: [
    { address: TADA_A_MVL, symbol: "A_MVL", decimals: 18 },
    { address: TADA_B_MVL, symbol: "B_MVL", decimals: 18 },
  ],
  staking: {
    masterChefAddress: envAddress(
      "NEXT_PUBLIC_TADA_MASTERCHEF_ADDRESS",
      "0x911843299861A4db1F6390184BbC54D203E50a9B",
    ),
    rewardTokenAddress: TADA_A_MVL,
    pools: DEFAULT_STAKING_POOLS,
    defaultPoolId: envNumber("NEXT_PUBLIC_TADA_POOL_ID", 0),
  },
};

export const mvlChain: ChainDefinition = {
  id: envNumber("NEXT_PUBLIC_MVL_CHAIN_ID", 8453200012),
  name: "MVL Testnet",
  rpcUrl: envString(
    "NEXT_PUBLIC_MVL_RPC_URL",
    "https://mvl-rpc-testnet.mvlchain.io",
  ),
  explorerUrl: envString(
    "NEXT_PUBLIC_MVL_EXPLORER_URL",
    "https://mvl-explorer-testnet.mvlchain.io",
  ),
  nativeSymbol: "LMVL",
  nativeDecimals: 18,
  blockTimeSeconds: envNumber("NEXT_PUBLIC_MVL_BLOCK_TIME_SECONDS", 1),
  tokens: [
    { address: MVL_A_MVL, symbol: "A_MVL", decimals: 18 },
    { address: MVL_B_MVL, symbol: "B_MVL", decimals: 18 },
  ],
  staking: {
    masterChefAddress: envAddress(
      "NEXT_PUBLIC_MVL_MASTERCHEF_ADDRESS",
      "0x0D29e1CF042c0fcdD860C15Ab4B90ecfB8d5cA0D",
    ),
    rewardTokenAddress: MVL_A_MVL,
    pools: DEFAULT_STAKING_POOLS,
    defaultPoolId: envNumber("NEXT_PUBLIC_MVL_POOL_ID", 0),
  },
};

export const sepoliaChain: ChainDefinition = {
  id: envNumber("NEXT_PUBLIC_SEPOLIA_CHAIN_ID", 11155111),
  name: "Ethereum Sepolia",
  rpcUrl: envString(
    "NEXT_PUBLIC_SEPOLIA_RPC_URL",
    "https://ethereum-sepolia-rpc.publicnode.com",
  ),
  explorerUrl: envString(
    "NEXT_PUBLIC_SEPOLIA_EXPLORER_URL",
    "https://sepolia.etherscan.io",
  ),
  nativeSymbol: "ETH",
  nativeDecimals: 18,
  blockTimeSeconds: 12,
  tokens: [
    { address: SEPOLIA_MVL, symbol: "MVL", decimals: 18 },
    { address: SEPOLIA_USDC, symbol: "USDC", decimals: 6 },
  ],
};

export const SUPPORTED_CHAINS: ChainDefinition[] = [tadaChain, mvlChain, sepoliaChain];

export const CHAIN_BY_ID: Record<number, ChainDefinition> = Object.fromEntries(
  SUPPORTED_CHAINS.map((chain) => [chain.id, chain]),
);
