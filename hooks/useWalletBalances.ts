import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { getChainConfig } from "@/lib/config";
import { erc20Abi } from "@/lib/contracts";
import { createChainPublicClient, toReadErrorMessage } from "@/lib/publicClient";
import { usePollCallback } from "./usePollCallback";

export function useWalletBalances() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const chain = getChainConfig(chainId);

  const [nativeBalance, setNativeBalance] = useState<bigint | undefined>(undefined);
  const [tokenBalances, setTokenBalances] = useState<bigint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refetch = useCallback(async () => {
    if (!isConnected || !address || !chain) {
      setNativeBalance(undefined);
      setTokenBalances([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const client = createChainPublicClient(chain);
      const [native, balances] = await Promise.all([
        client.getBalance({ address }),
        Promise.all(
          chain.tokens.map((token) =>
            client.readContract({
              address: token.address,
              abi: erc20Abi,
              functionName: "balanceOf",
              args: [address],
            }) as Promise<bigint>,
          ),
        ),
      ]);

      if (requestId !== requestIdRef.current) return;

      setNativeBalance(native);
      setTokenBalances(balances);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(toReadErrorMessage(err));
      console.error(err);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [address, chain, isConnected]);

  useEffect(() => {
    // Initial fetch when wallet/chain deps change; async setState is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refetch();
  }, [refetch]);

  usePollCallback(refetch, isConnected && !!address && !!chain);

  return {
    chain,
    nativeBalance,
    tokenBalances,
    tokens: chain?.tokens ?? [],
    nativeSymbol: chain?.nativeSymbol ?? "",
    isLoading,
    error,
    refetch,
  };
}
