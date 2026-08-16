import { createPublicClient, http, type Address, type PublicClient } from "viem";
import type { ChainDefinition } from "@/lib/config";

export function createChainPublicClient(chain: ChainDefinition): PublicClient {
  return createPublicClient({
    chain: {
      id: chain.id,
      name: chain.name,
      nativeCurrency: {
        name: chain.nativeSymbol,
        symbol: chain.nativeSymbol,
        decimals: chain.nativeDecimals,
      },
      rpcUrls: { default: { http: [chain.rpcUrl] } },
    },
    transport: http(chain.rpcUrl),
  });
}

export function toReadErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Failed to load on-chain data";
}
