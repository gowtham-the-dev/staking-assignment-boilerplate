"use client";

import { useState, useCallback } from "react";
import { useChainId, useConnection } from "wagmi";
import { getChainConfig, getPoolConfig, isStakingSupported } from "@/lib/config";
import { calculateApr } from "@/lib/apr";
import { parseAmount } from "@/lib/format";
import { useWalletBalances } from "@/hooks/useWalletBalances";
import { useStakingPool } from "@/hooks/useStakingPool";
import { useContractTx } from "@/hooks/useContractTx";
import { Header } from "@/components/Header";
import { AppTabs } from "@/components/AppTabs";
import { WalletTab } from "@/components/WalletTab";
import { StakingTab } from "@/components/StakingTab";

type Tab = "wallet" | "staking";

export default function Home() {
  const [tab, setTab] = useState<Tab>("wallet");
  const [pid, setPid] = useState(0);
  const [mode, setMode] = useState<"stake" | "unstake">("stake");
  const [amount, setAmount] = useState("");

  const { address, isConnected } = useConnection();
  const chainId = useChainId();
  const chain = getChainConfig(chainId);
  const stakingSupported = isStakingSupported(chainId);

  const {
    nativeBalance,
    tokenBalances,
    tokens,
    nativeSymbol,
    isLoading: walletLoading,
    error: walletError,
    refetch: refetchWallet,
  } = useWalletBalances();

  const {
    staking,
    mvlPerBlock,
    allocPoint,
    totalAllocPoint,
    totalStaked,
    depositTokenAddr,
    staked,
    stakeWalletBalance,
    allowance,
    pendingReward,
    windowActive,
    isLoading: poolLoading,
    error: poolError,
    refetch: refetchPool,
  } = useStakingPool(pid);

  const onTxConfirmed = useCallback(() => {
    refetchPool();
    refetchWallet();
  }, [refetchPool, refetchWallet]);

  const {
    phase: txPhase,
    hash: txHash,
    message: txMsg,
    isTxPending,
    reset: resetTx,
    stake,
    withdraw,
    harvest,
  } = useContractTx(onTxConfirmed);

  const networkName = chain?.name ?? "Unknown network";
  const explorer = chain?.explorerUrl ?? "";
  const pools = staking?.pools ?? [];
  const poolConfig = getPoolConfig(chainId, pid);
  const nativeDecimals = chain?.nativeDecimals ?? 18;
  const depositToken =
    chain?.tokens.find(
      (t) =>
        depositTokenAddr &&
        t.address.toLowerCase() === depositTokenAddr.toLowerCase(),
    ) ?? null;
  const depositDecimals = depositToken?.decimals ?? 18;
  const depositSymbol = depositToken?.symbol ?? "TOKEN";
  const rewardToken =
    chain?.tokens.find(
      (t) =>
        staking?.rewardTokenAddress &&
        t.address.toLowerCase() === staking.rewardTokenAddress.toLowerCase(),
    ) ?? null;
  const rewardDecimals = rewardToken?.decimals ?? 18;
  const rewardSymbol = rewardToken?.symbol ?? nativeSymbol;
  const poolLabel = poolConfig?.label ?? `Pool ${pid}`;

  const apr =
    mvlPerBlock !== undefined &&
    allocPoint !== undefined &&
    totalAllocPoint !== undefined &&
    totalStaked !== undefined &&
    poolConfig &&
    chain
      ? calculateApr({
          mvlPerBlock,
          allocPoint,
          totalAllocPoint,
          totalStaked,
          blockTimeSeconds: chain.blockTimeSeconds,
          poolConfig,
          windowActive,
        })
      : null;

  const parsed = parseAmount(amount, depositDecimals);
  const balanceForMode = mode === "stake" ? stakeWalletBalance : staked;
  const needsApprove =
    mode === "stake" && parsed !== undefined && allowance !== undefined && allowance < parsed;

  let validationMsg: string | null = null;
  if (amount.trim() !== "") {
    if (parsed === undefined) validationMsg = "Enter a valid number";
    else if (parsed <= 0n) validationMsg = "Amount must be greater than 0";
    else if (balanceForMode !== undefined && parsed > balanceForMode)
      validationMsg = mode === "stake" ? "Exceeds wallet balance" : "Exceeds staked amount";
  }

  const canAct = isConnected && parsed !== undefined && parsed > 0n && !validationMsg && !isTxPending;
  const canHarvest = isConnected && pendingReward !== undefined && pendingReward > 0n && !isTxPending;
  const masterChefAddress = staking?.masterChefAddress;

  async function handleStake() {
    if (parsed === undefined || !depositTokenAddr || !address || !masterChefAddress) return;
    const ok = await stake({
      masterChefAddress,
      depositTokenAddr,
      pid,
      amount: parsed,
      recipient: address,
      needsApprove,
    });
    if (ok) setAmount("");
  }

  async function handleWithdraw(withHarvest: boolean) {
    if (parsed === undefined || !address || !masterChefAddress) return;
    const ok = await withdraw({
      masterChefAddress,
      pid,
      amount: parsed,
      recipient: address,
      withHarvest,
    });
    if (ok) setAmount("");
  }

  async function handleHarvest() {
    if (!address || !masterChefAddress) return;
    await harvest({ masterChefAddress, pid, recipient: address });
  }

  function handleModeChange(next: "stake" | "unstake") {
    setMode(next);
    setAmount("");
  }

  function handleTabChange(next: Tab) {
    setTab(next);
  }

  return (
    <div className="app">
      <Header
        activeTab={tab}
        onTabChange={handleTabChange}
        stakingSupported={stakingSupported}
      />

      <main>
        {tab === "wallet" ? (
          <WalletTab
            isConnected={isConnected}
            hasChain={chain !== undefined}
            isLoading={walletLoading}
            error={walletError}
            nativeBalance={nativeBalance}
            nativeSymbol={nativeSymbol}
            nativeDecimals={nativeDecimals}
            tokens={tokens}
            tokenBalances={tokenBalances}
            networkName={networkName}
            address={address}
            explorerUrl={explorer}
          />
        ) : (
          <StakingTab
            networkName={networkName}
            stakingSupported={stakingSupported}
            isConnected={isConnected}
            pools={pools}
            pid={pid}
            onPidChange={setPid}
            poolLabel={poolLabel}
            poolError={poolError}
            poolLoading={poolLoading}
            hasPoolData={mvlPerBlock !== undefined}
            pendingReward={pendingReward}
            rewardDecimals={rewardDecimals}
            rewardSymbol={rewardSymbol}
            depositSymbol={depositSymbol}
            apr={apr}
            canHarvest={canHarvest}
            isTxPending={isTxPending}
            onHarvest={handleHarvest}
            stakeWalletBalance={stakeWalletBalance}
            staked={staked}
            totalStaked={totalStaked}
            depositDecimals={depositDecimals}
            mode={mode}
            onModeChange={handleModeChange}
            amount={amount}
            onAmountChange={setAmount}
            balanceForMode={balanceForMode}
            validationMsg={validationMsg}
            canAct={canAct}
            needsApprove={needsApprove}
            onStake={handleStake}
            onWithdraw={handleWithdraw}
            txPhase={txPhase}
            txMsg={txMsg}
            txHash={txHash}
            explorerUrl={explorer}
            onDismissTx={resetTx}
          />
        )}
      </main>

      <AppTabs
        activeTab={tab}
        onTabChange={handleTabChange}
        stakingSupported={stakingSupported}
        className="mobile-tab-bar seg"
      />

      <footer>
        {networkName} · Chain {chainId}
      </footer>
    </div>
  );
}
