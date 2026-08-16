import { useCallback, useState } from "react";
import type { Address, Hex } from "viem";
import { maxUint256 } from "viem";
import { useChainId, useWriteContract } from "wagmi";
import { getChainConfig } from "@/lib/config";
import { erc20Abi, masterChefAbi } from "@/lib/contracts";
import { createChainPublicClient } from "@/lib/publicClient";

export type TxPhase = "idle" | "signing" | "confirming" | "success" | "error";

type WriteParams = Parameters<
  ReturnType<typeof useWriteContract>["mutateAsync"]
>[0];

function toTxErrorMessage(error: unknown): string {
  const code = (error as { code?: number })?.code;
  if (code === 4001) return "Transaction rejected in wallet";

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("user rejected") || msg.includes("user denied")) {
      return "Transaction rejected in wallet";
    }
    if (msg.includes("insufficient funds")) {
      return "Insufficient funds for gas";
    }
    if (msg.includes("reverted")) {
      return "Transaction reverted on-chain";
    }
    return error.message;
  }

  return "Transaction failed";
}

export function useContractTx(onConfirmed?: () => void) {
  const chainId = useChainId();
  const chain = getChainConfig(chainId);
  const { mutateAsync: writeContractAsync } = useWriteContract();

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
      setPhase("signing");
      setMessage(labels.signing);
      setError(null);

      const txHash = await writeContractAsync(params);
      setHash(txHash);
      setPhase("confirming");
      setMessage(labels.confirming);
      await waitForReceipt(txHash);
      return txHash;
    },
    [waitForReceipt, writeContractAsync],
  );

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
        const errMsg = toTxErrorMessage(err);
        setPhase("error");
        setError(errMsg);
        setMessage(errMsg);
        console.error(err);
        return undefined;
      }
    },
    [isTxPending, onConfirmed, runWrite],
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
              args: [masterChefAddress, maxUint256],
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
        const errMsg = toTxErrorMessage(err);
        setPhase("error");
        setError(errMsg);
        setMessage(errMsg);
        console.error(err);
        return false;
      }
    },
    [isTxPending, onConfirmed, runWrite],
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
          signing: withHarvest ? "Confirm withdraw + harvest in wallet…" : "Confirm withdraw in wallet…",
          confirming: withHarvest ? "Confirming withdraw + harvest…" : "Confirming withdraw…",
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
