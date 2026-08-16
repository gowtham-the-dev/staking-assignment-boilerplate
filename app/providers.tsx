"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { defineChain } from "viem";
import {
  TADA_CHAIN_ID,
  TADA_EXPLORER_URL,
  TADA_NETWORK_NAME,
  TADA_NATIVE_SYMBOL,
  TADA_RPC_URL,
} from "@/lib/networks";

const tadaChain = defineChain({
  id: TADA_CHAIN_ID,
  name: TADA_NETWORK_NAME,
  nativeCurrency: { name: TADA_NATIVE_SYMBOL, symbol: TADA_NATIVE_SYMBOL, decimals: 18 },
  rpcUrls: { default: { http: [TADA_RPC_URL] } },
  blockExplorers: {
    default: {
      name: "Explorer",
      url: TADA_EXPLORER_URL,
    },
  },
  testnet: true,
});

const wagmiConfig = createConfig({
  chains: [tadaChain] as const,
  connectors: [injected({ target: "metaMask" })],
  transports: {
    [TADA_CHAIN_ID]: http(TADA_RPC_URL),
  },
  ssr: true,
});

export { wagmiConfig, tadaChain };

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 2_000, retry: 1 },
        },
      }),
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
