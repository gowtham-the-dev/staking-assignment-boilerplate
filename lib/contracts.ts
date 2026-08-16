// Contract ABIs — address constants live in lib/config/chains.ts.

import type { Abi } from "viem";
import masterChefJson from "@/abi/MasterChefSingleEvent.json";
import erc20Json from "@/abi/TestToken.json";

export const masterChefAbi = masterChefJson as Abi;
export const erc20Abi = erc20Json as Abi;
