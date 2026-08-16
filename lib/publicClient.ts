import { createPublicClient, http, type PublicClient } from "viem";
import type { ChainDefinition } from "@/lib/config";
import { READ_ERROR_FALLBACK, toUserFacingError } from "@/lib/errors";

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
  return toUserFacingError(error, READ_ERROR_FALLBACK);
}
