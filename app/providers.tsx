"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { defineChain, type Chain } from "viem";
import { SUPPORTED_CHAINS, type ChainDefinition } from "@/lib/config";

function toWagmiChain(def: ChainDefinition): Chain {
  return defineChain({
    id: def.id,
    name: def.name,
    nativeCurrency: {
      name: def.nativeSymbol,
      symbol: def.nativeSymbol,
      decimals: def.nativeDecimals,
    },
    rpcUrls: { default: { http: [def.rpcUrl] } },
    blockExplorers: {
      default: {
        name: "Explorer",
        url: def.explorerUrl,
      },
    },
    testnet: true,
  });
}

const wagmiChains = SUPPORTED_CHAINS.map(toWagmiChain) as [Chain, ...Chain[]];

const transports = Object.fromEntries(
  SUPPORTED_CHAINS.map((chain) => [chain.id, http(chain.rpcUrl)]),
);

const wagmiConfig = createConfig({
  chains: wagmiChains,
  connectors: [injected({ target: "metaMask" })],
  transports,
  ssr: true,
});

export { wagmiConfig, wagmiChains };

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
