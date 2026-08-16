import { useCallback, useState } from "react";
import type { Address, Hex } from "viem";
import { useChainId, useConnection, useWriteContract } from "wagmi";
import { getChainConfig, isStakingSupported } from "@/lib/config";
import { erc20Abi, masterChefAbi } from "@/lib/contracts";
import { TX_ERROR_FALLBACK, toUserFacingError } from "@/lib/errors";
import { createChainPublicClient } from "@/lib/publicClient";

export type TxPhase = "idle" | "signing" | "confirming" | "success" | "error";

type WriteParams = Parameters<
  ReturnType<typeof useWriteContract>["mutateAsync"]
>[0];

function requireStakingContext(
  chainId: number,
  chain: ReturnType<typeof getChainConfig>,
  account: Address | undefined,
): { chain: NonNullable<ReturnType<typeof getChainConfig>>; account: Address } {
  if (!account) throw new Error("Wallet not connected");
  if (!chain) throw new Error("Unsupported network");
  if (!isStakingSupported(chainId)) {
    throw new Error("Staking is not supported on this network");
  }
  return { chain, account };
}

export function useContractTx(onConfirmed?: () => void) {
  const chainId = useChainId();
  const chain = getChainConfig(chainId);
  const { address } = useConnection();
  const writeContract = useWriteContract();

  const [phase, setPhase] = useState<TxPhase>("idle");
  const [hash, setHash] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isTxPending = phase === "signing" || phase === "confirming";

  const reset = useCallback(() => {
    setPhase("idle");
    setHash(null);
    setMessage(null);
    setError(null);
  }, []);

  const waitForReceipt = useCallback(
    async (txHash: string) => {
      if (!chain) throw new Error("Unsupported network");
      const client = createChainPublicClient(chain);
      const receipt = await client.waitForTransactionReceipt({
        hash: txHash as Hex,
      });
      if (receipt.status === "reverted") {
        throw new Error("Transaction reverted on-chain");
      }
      return receipt;
    },
    [chain],
  );

  const runWrite = useCallback(
    async (
      params: WriteParams,
      labels: { signing: string; confirming: string },
    ): Promise<string> => {
      const { chain: activeChain, account } = requireStakingContext(chainId, chain, address);

      const client = createChainPublicClient(activeChain);
      await client.simulateContract({
        address: params.address,
        abi: params.abi,
        functionName: params.functionName,
        args: params.args,
        account,
      });

      setPhase("signing");
      setMessage(labels.signing);
      setError(null);

      const txHash = await writeContract.mutateAsync(params);
      setHash(txHash);
      setPhase("confirming");
      setMessage(labels.confirming);
      await waitForReceipt(txHash);
      return txHash;
    },
    [address, chain, chainId, waitForReceipt, writeContract.mutateAsync],
  );

  const handleFailure = useCallback((err: unknown) => {
    const errMsg = toUserFacingError(err, TX_ERROR_FALLBACK);
    setPhase("error");
    setError(errMsg);
    setMessage(errMsg);
    console.error(err);
  }, []);

  const execute = useCallback(
    async (
      params: WriteParams,
      labels: {
        signing: string;
        confirming: string;
        success: string;
      },
    ): Promise<string | undefined> => {
      if (isTxPending) return undefined;

      try {
        const txHash = await runWrite(params, labels);
        setPhase("success");
        setMessage(labels.success);
        onConfirmed?.();
        return txHash;
      } catch (err) {
        handleFailure(err);
        return undefined;
      }
    },
    [handleFailure, isTxPending, onConfirmed, runWrite],
  );

  const stake = useCallback(
    async ({
      masterChefAddress,
      depositTokenAddr,
      pid,
      amount,
      recipient,
      needsApprove,
    }: {
      masterChefAddress: Address;
      depositTokenAddr: Address;
      pid: number;
      amount: bigint;
      recipient: Address;
      needsApprove: boolean;
    }): Promise<boolean> => {
      if (isTxPending) return false;

      try {
        if (needsApprove) {
          await runWrite(
            {
              address: depositTokenAddr,
              abi: erc20Abi,
              functionName: "approve",
              args: [masterChefAddress, amount],
            },
            {
              signing: "Approve in wallet…",
              confirming: "Confirming approval…",
            },
          );
        }

        const txHash = await runWrite(
          {
            address: masterChefAddress,
            abi: masterChefAbi,
            functionName: "deposit",
            args: [BigInt(pid), amount, recipient],
          },
          {
            signing: "Confirm deposit in wallet…",
            confirming: "Confirming deposit…",
          },
        );

        setPhase("success");
        setMessage("Deposit confirmed");
        setHash(txHash);
        onConfirmed?.();
        return true;
      } catch (err) {
        handleFailure(err);
        return false;
      }
    },
    [handleFailure, isTxPending, onConfirmed, runWrite],
  );

  const withdraw = useCallback(
    async ({
      masterChefAddress,
      pid,
      amount,
      recipient,
      withHarvest,
    }: {
      masterChefAddress: Address;
      pid: number;
      amount: bigint;
      recipient: Address;
      withHarvest: boolean;
    }): Promise<boolean> => {
      const fn = withHarvest ? "withdrawAndHarvest" : "withdraw";
      const success = withHarvest ? "Withdraw + harvest confirmed" : "Withdraw confirmed";

      const txHash = await execute(
        {
          address: masterChefAddress,
          abi: masterChefAbi,
          functionName: fn,
          args: [BigInt(pid), amount, recipient],
        },
        {
          signing: withHarvest
            ? "Confirm withdraw + harvest in wallet…"
            : "Confirm withdraw in wallet…",
          confirming: withHarvest
            ? "Confirming withdraw + harvest…"
            : "Confirming withdraw…",
          success,
        },
      );

      return txHash !== undefined;
    },
    [execute],
  );

  const harvest = useCallback(
    async ({
      masterChefAddress,
      pid,
      recipient,
    }: {
      masterChefAddress: Address;
      pid: number;
      recipient: Address;
    }): Promise<boolean> => {
      const txHash = await execute(
        {
          address: masterChefAddress,
          abi: masterChefAbi,
          functionName: "harvest",
          args: [BigInt(pid), recipient],
        },
        {
          signing: "Confirm harvest in wallet…",
          confirming: "Confirming harvest…",
          success: "Harvest confirmed",
        },
      );

      return txHash !== undefined;
    },
    [execute],
  );

  return {
    phase,
    hash,
    message,
    error,
    isTxPending,
    reset,
    stake,
    withdraw,
    harvest,
  };
}
