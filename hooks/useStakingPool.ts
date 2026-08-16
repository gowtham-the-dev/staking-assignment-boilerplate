import { useCallback, useEffect, useRef, useState } from "react";
import type { Address } from "viem";
import { useAccount, useChainId } from "wagmi";
import { getChainConfig, getStakingConfig } from "@/lib/config";
import { erc20Abi, masterChefAbi } from "@/lib/contracts";
import { createChainPublicClient, toReadErrorMessage } from "@/lib/publicClient";
import { usePollCallback } from "./usePollCallback";

export function useStakingPool(pid: number) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const chain = getChainConfig(chainId);
  const staking = getStakingConfig(chainId);

  const [mvlPerBlock, setMvlPerBlock] = useState<bigint | undefined>(undefined);
  const [allocPoint, setAllocPoint] = useState<bigint | undefined>(undefined);
  const [totalAllocPoint, setTotalAllocPoint] = useState<bigint | undefined>(undefined);
  const [startBlock, setStartBlock] = useState<bigint | undefined>(undefined);
  const [endBlock, setEndBlock] = useState<bigint | undefined>(undefined);
  const [currentBlock, setCurrentBlock] = useState<bigint | undefined>(undefined);
  const [totalStaked, setTotalStaked] = useState<bigint | undefined>(undefined);
  const [depositTokenAddr, setDepositTokenAddr] = useState<Address | undefined>(undefined);
  const [staked, setStaked] = useState<bigint | undefined>(undefined);
  const [stakeWalletBalance, setStakeWalletBalance] = useState<bigint | undefined>(undefined);
  const [allowance, setAllowance] = useState<bigint | undefined>(undefined);
  const [pendingReward, setPendingReward] = useState<bigint | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const clearPoolState = useCallback(() => {
    setMvlPerBlock(undefined);
    setAllocPoint(undefined);
    setTotalAllocPoint(undefined);
    setStartBlock(undefined);
    setEndBlock(undefined);
    setCurrentBlock(undefined);
    setTotalStaked(undefined);
    setDepositTokenAddr(undefined);
    setStaked(undefined);
    setStakeWalletBalance(undefined);
    setAllowance(undefined);
    setPendingReward(undefined);
  }, []);

  const refetch = useCallback(async () => {
    if (!chain || !staking) {
      clearPoolState();
      setError(null);
      setIsLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const client = createChainPublicClient(chain);
      const chef = staking.masterChefAddress;
      const base = { address: chef, abi: masterChefAbi } as const;

      const [block, poolInfo, perBlock, totalAlloc, sBlock, eBlock] = await Promise.all([
        client.getBlockNumber(),
        client.readContract({
          ...base,
          functionName: "poolInfo",
          args: [BigInt(pid)],
        }) as Promise<readonly [Address, bigint, bigint, bigint]>,
        client.readContract({
          ...base,
          functionName: "mvlPerBlock",
        }) as Promise<bigint>,
        client.readContract({
          ...base,
          functionName: "totalAllocPoint",
        }) as Promise<bigint>,
        client.readContract({
          ...base,
          functionName: "startBlock",
        }) as Promise<bigint>,
        client.readContract({
          ...base,
          functionName: "endBlock",
        }) as Promise<bigint>,
      ]);

      const lpToken = poolInfo[0];
      const poolAllocPoint = poolInfo[1];

      const totStaked = (await client.readContract({
        address: lpToken,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [chef],
      })) as bigint;

      let userStaked: bigint | undefined;
      let walletBal: bigint | undefined;
      let allow: bigint | undefined;
      let pending: bigint | undefined;

      if (isConnected && address) {
        const [userInfo, bal, allowanceValue, pendingValue] = await Promise.all([
          client.readContract({
            ...base,
            functionName: "userInfo",
            args: [BigInt(pid), address],
          }) as Promise<readonly [bigint, bigint]>,
          client.readContract({
            address: lpToken,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [address],
          }) as Promise<bigint>,
          client.readContract({
            address: lpToken,
            abi: erc20Abi,
            functionName: "allowance",
            args: [address, chef],
          }) as Promise<bigint>,
          client.readContract({
            ...base,
            functionName: "pendingMvl",
            args: [BigInt(pid), address],
          }) as Promise<bigint>,
        ]);

        userStaked = userInfo[0];
        walletBal = bal;
        allow = allowanceValue;
        pending = pendingValue;
      }

      if (requestId !== requestIdRef.current) return;

      setDepositTokenAddr(lpToken);
      setMvlPerBlock(perBlock);
      setAllocPoint(poolAllocPoint);
      setTotalAllocPoint(totalAlloc);
      setStartBlock(sBlock);
      setEndBlock(eBlock);
      setCurrentBlock(block);
      setTotalStaked(totStaked);
      setStaked(userStaked);
      setStakeWalletBalance(walletBal);
      setAllowance(allow);
      setPendingReward(pending);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(toReadErrorMessage(err));
      console.error(err);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [address, chain, clearPoolState, isConnected, pid, staking]);

  useEffect(() => {
    // Initial fetch when pool/chain deps change; async setState is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refetch();
  }, [refetch]);

  const pollingEnabled = !!chain && !!staking;
  usePollCallback(refetch, pollingEnabled);

  const windowActive =
    currentBlock !== undefined &&
    startBlock !== undefined &&
    endBlock !== undefined &&
    currentBlock >= startBlock &&
    currentBlock < endBlock;

  return {
    chain,
    staking,
    mvlPerBlock,
    allocPoint,
    totalAllocPoint,
    startBlock,
    endBlock,
    currentBlock,
    totalStaked,
    depositTokenAddr,
    staked,
    stakeWalletBalance,
    allowance,
    pendingReward,
    windowActive,
    isLoading,
    error,
    refetch,
  };
}