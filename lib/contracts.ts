// Contract wiring: ABIs + the TADA staking addresses. We read from env when
// present but keep the known-good deployed addresses as a fallback so the app
// still works out of the box.

import type { Abi } from "viem";
import masterChefJson from "@/abi/MasterChefSingleEvent.json";
import erc20Json from "@/abi/TestToken.json";

export const masterChefAbi = masterChefJson as Abi;
export const erc20Abi = erc20Json as Abi;

export const TADA_CHAIN_ID = 31451;

// TADA staking contract (deployed on TADA L1).
export const MASTERCHEF_ADDRESS: `0x${string}` =
  (process.env.NEXT_PUBLIC_TADA_MASTERCHEF_ADDRESS as `0x${string}`) ??
  "0x911843299861A4db1F6390184BbC54D203E50a9B";

// A_MVL — reward token + pool0 deposit token.
export const A_MVL_ADDRESS: `0x${string}` =
  (process.env.NEXT_PUBLIC_TADA_STAKING_TOKEN_ADDRESS as `0x${string}`) ??
  "0xa9728bf6a4cb2646e4E6E6B074CCc5305DBC904f";

// B_MVL — pool1 deposit token.
export const B_MVL_ADDRESS: `0x${string}` =
  (process.env.NEXT_PUBLIC_TADA_STAKING_TOKEN_ADDRESS_B as `0x${string}`) ??
  "0x8999b932877c854df9Ce4EEC737cb0CdFEC48A18";

export const DEFAULT_POOL_ID = Number(
  process.env.NEXT_PUBLIC_TADA_POOL_ID ?? "0",
);
