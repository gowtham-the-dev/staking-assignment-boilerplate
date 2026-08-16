"use client";

import { useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useChainId,
  useWriteContract,
} from "wagmi";
import { maxUint256 } from "viem";
import { injected } from "wagmi/connectors";
import {
  APR_DEPOSIT_TOKEN_VALUE,
  TADA_BLOCK_TIME_SECONDS,
} from "@/lib/networks";
import { getChainConfig, isStakingSupported } from "@/lib/config";
import { erc20Abi, masterChefAbi } from "@/lib/contracts";
import { formatAmount, parseAmount, toFullPrecision, shortAddress, toNumber } from "@/lib/format";
import { useWalletBalances } from "@/hooks/useWalletBalances";
import { useStakingPool } from "@/hooks/useStakingPool";

const SECONDS_PER_YEAR = 31_536_000;

type Tab = "wallet" | "staking";

export default function Home() {
  const [tab, setTab] = useState<Tab>("wallet");

  const { address, isConnected } = useAccount();
  const { mutate: connect, isPending: connecting } = useConnect();
  const { mutate: disconnect } = useDisconnect();
  const chainId = useChainId();
  const { mutateAsync: writeContractAsync } = useWriteContract();

  const chain = getChainConfig(chainId);
  const stakingSupported = isStakingSupported(chainId);

  const {
    nativeBalance,
    tokenBalances,
    tokens,
    nativeSymbol,
    isLoading: walletLoading,
    error: walletError,
  } = useWalletBalances();

  const [pid, setPid] = useState(0);
  const {
    staking,
    mvlPerBlock,
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

  // form
  const [mode, setMode] = useState<"stake" | "unstake">("stake");
  const [amount, setAmount] = useState("");
  const [txMsg, setTxMsg] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // ── APR (legacy calc — apr-fix todo) ────────────────────────────────
  let apr: number | null = null;
  if (mvlPerBlock !== undefined && totalStaked !== undefined && totalStaked > 0n) {
    const blockTime = chain?.blockTimeSeconds ?? TADA_BLOCK_TIME_SECONDS;
    const blocksPerYear = SECONDS_PER_YEAR / blockTime;
    const annual = Number(mvlPerBlock) * blocksPerYear;
    const stakedValue = Number(totalStaked) * APR_DEPOSIT_TOKEN_VALUE;
    apr = (annual / stakedValue) * 100;
    if (!Number.isFinite(apr)) apr = null;
  }

  // ── form derived ────────────────────────────────────────────────────
  const parsed = parseAmount(amount);
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
  const canAct = isConnected && parsed !== undefined && parsed > 0n && !validationMsg;

  const masterChefAddress = staking?.masterChefAddress;
  const explorer = chain?.explorerUrl ?? "";
  const networkName = chain?.name ?? "Unknown network";
  const pools = staking?.pools ?? [];

  // ── actions ─────────────────────────────────────────────────────────
  async function handleStake() {
    if (parsed === undefined || !depositTokenAddr || !address || !masterChefAddress) return;
    if (needsApprove) {
      await writeContractAsync({
        address: depositTokenAddr,
        abi: erc20Abi,
        functionName: "approve",
        args: [masterChefAddress, maxUint256],
      });
    }
    const hash = await writeContractAsync({
      address: masterChefAddress,
      abi: masterChefAbi,
      functionName: "deposit",
      args: [BigInt(pid), parsed, address],
    });
    setTxHash(hash);
    setTxMsg("Deposit submitted");
    setAmount("");
    refetchPool();
  }

  async function handleWithdraw(withHarvest: boolean) {
    if (parsed === undefined || !address || !masterChefAddress) return;
    const fn = withHarvest ? "withdrawAndHarvest" : "withdraw";
    const hash = await writeContractAsync({
      address: masterChefAddress,
      abi: masterChefAbi,
      functionName: fn,
      args: [BigInt(pid), parsed, address],
    });
    setTxHash(hash);
    setTxMsg(withHarvest ? "Withdraw + harvest submitted" : "Withdraw submitted");
    setAmount("");
    refetchPool();
  }

  async function handleHarvest() {
    if (!address || !masterChefAddress) return;
    const hash = await writeContractAsync({
      address: masterChefAddress,
      abi: masterChefAbi,
      functionName: "harvest",
      args: [BigInt(pid), address],
    });
    setTxHash(hash);
    setTxMsg("Harvest submitted");
    refetchPool();
  }

  // ── render ──────────────────────────────────────────────────────────
  return (
    <div className="app">
      <header>
        <div className="brand">MVL dApp</div>
        <div className="chips">
          <div className="net-pill-wrap">
            <span className="net-pill">
              <span className="net-pill-name">{networkName}</span>
            </span>
          </div>
          {isConnected ? (
            <button className="chip" onClick={() => disconnect()}>
              {shortAddress(address)}
            </button>
          ) : (
            <button
              className="chip"
              onClick={() => connect({ connector: injected({ target: "metaMask" }) })}
              disabled={connecting}
            >
              {connecting ? "Connecting…" : "Connect Wallet"}
            </button>
          )}
        </div>
      </header>

      <nav className="tabs">
        <button className={tab === "wallet" ? "active" : ""} onClick={() => setTab("wallet")}>
          Wallet
        </button>
        <button className={tab === "staking" ? "active" : ""} onClick={() => setTab("staking")}>
          Staking
        </button>
      </nav>

      <main>
        {tab === "wallet" ? (
          <section className="card">
            {!isConnected ? (
              <p className="empty">Connect your wallet to view balances.</p>
            ) : !chain ? (
              <p className="empty">Switch to a supported network to view balances.</p>
            ) : (
              <>
                {walletError && (
                  <div className="banner banner-info">
                    <div className="banner-text">{walletError}</div>
                  </div>
                )}
                {walletLoading && nativeBalance === undefined && !walletError && (
                  <p className="empty">Loading balances…</p>
                )}
                <div className="bal-block">
                  <div className="k">Native balance</div>
                  <div className="v big">
                    {formatAmount(nativeBalance)} <small>{nativeSymbol}</small>
                  </div>
                </div>
                <div className="token-list">
                  {tokens.map((t, i) => (
                    <div className="token-row" key={t.address}>
                      <span className="token-sym">{t.symbol}</span>
                      <span className="token-bal">{formatAmount(tokenBalances[i])}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        ) : (
          <>
            {!stakingSupported ? (
              <div className="banner banner-info">
                <div className="banner-text">
                  Staking is not available on {networkName}. Switch to TADA or MVL Testnet.
                </div>
              </div>
            ) : !isConnected ? (
              <section className="card">
                <p className="empty">Connect your wallet to stake.</p>
              </section>
            ) : (
              <>
                {poolError && (
                  <div className="banner banner-info">
                    <div className="banner-text">{poolError}</div>
                  </div>
                )}
                {poolLoading && mvlPerBlock === undefined && !poolError && (
                  <p className="empty">Loading pool data…</p>
                )}
                {pools.length > 1 && (
                  <div className="pool-tabs">
                    {pools.map((pool) => (
                      <button
                        key={pool.pid}
                        className={pid === pool.pid ? "active" : ""}
                        onClick={() => setPid(pool.pid)}
                      >
                        {pool.label}
                      </button>
                    ))}
                  </div>
                )}

                <section className="hero">
                  <div className="reward">
                    <div className="label">Pending reward</div>
                    <div className="big">{formatAmount(pendingReward)}</div>
                  </div>
                  <div className="apr">
                    <div className="label">APR</div>
                    <div className="v">
                      {pid === 1
                        ? `${apr !== null ? apr.toFixed(2) : "0.00"}%`
                        : apr !== null && windowActive
                          ? `${apr.toFixed(2)}%`
                          : "0.00%"}
                    </div>
                  </div>
                  <button className="btn btn-claim" onClick={handleHarvest}>
                    Harvest
                  </button>
                </section>

                <div className="stats">
                  <div className="stat">
                    <div className="k">Wallet balance</div>
                    <div className="v">{formatAmount(stakeWalletBalance)}</div>
                  </div>
                  <div className="stat">
                    <div className="k">Staked</div>
                    <div className="v">{staked !== undefined ? staked.toString() : "—"}</div>
                  </div>
                  <div className="stat">
                    <div className="k">Total staked (raw)</div>
                    <div className="v">{toNumber(totalStaked).toLocaleString()}</div>
                  </div>
                </div>

                <section className="card">
                  <div className="seg">
                    <button
                      className={mode === "stake" ? "active" : ""}
                      onClick={() => {
                        setMode("stake");
                        setAmount("");
                      }}
                    >
                      Stake
                    </button>
                    <button
                      className={mode === "unstake" ? "active" : ""}
                      onClick={() => {
                        setMode("unstake");
                        setAmount("");
                      }}
                    >
                      Unstake
                    </button>
                  </div>

                  <div className="field">
                    <input
                      value={amount}
                      inputMode="decimal"
                      placeholder="0.0"
                      onChange={(e) => setAmount(e.target.value)}
                    />
                    <button
                      className="max"
                      type="button"
                      onClick={() => balanceForMode !== undefined && setAmount(toFullPrecision(balanceForMode))}
                    >
                      MAX
                    </button>
                  </div>

                  <div className="bal-hint">
                    <span>{mode === "stake" ? "Available to stake" : "Available to unstake"}</span>
                    <span>{formatAmount(balanceForMode)}</span>
                  </div>

                  {validationMsg && <div className="validation">{validationMsg}</div>}

                  {mode === "stake" ? (
                    <button className="btn btn-primary" onClick={handleStake} disabled={!canAct}>
                      {needsApprove ? "Approve & Stake" : "Stake"}
                    </button>
                  ) : (
                    <div className="btn-row">
                      <button
                        className="btn btn-ghost"
                        onClick={() => handleWithdraw(false)}
                        disabled={!canAct}
                      >
                        Withdraw
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleWithdraw(true)}
                        disabled={!canAct}
                      >
                        Withdraw + harvest
                      </button>
                    </div>
                  )}
                </section>

                {txMsg && (
                  <div className="tx tx-info">
                    <span className="tx-msg">{txMsg}</span>
                    {txHash && explorer && (
                      <a className="tx-link" href={`${explorer}/tx/${txHash}`} target="_blank" rel="noreferrer">
                        View
                      </a>
                    )}
                    <button className="tx-x" onClick={() => { setTxMsg(null); setTxHash(null); }}>
                      ✕
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      <footer>
        {networkName} · Chain {chainId}
      </footer>
    </div>
  );
}
