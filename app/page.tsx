"use client";

import { useEffect, useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useChainId,
  useWriteContract,
} from "wagmi";
import { createPublicClient, http, maxUint256 } from "viem";
import { injected } from "wagmi/connectors";
import {
  APR_DEPOSIT_TOKEN_VALUE,
  TADA_BLOCK_TIME_SECONDS,
  TADA_CHAIN_ID,
  TADA_EXPLORER_URL,
  TADA_MASTERCHEF_ADDRESS,
  TADA_NATIVE_SYMBOL,
  TADA_NETWORK_NAME,
  TADA_RPC_URL,
  TADA_TOKENS,
} from "@/lib/networks";
import { erc20Abi, masterChefAbi } from "@/lib/contracts";
import { formatAmount, parseAmount, toFullPrecision, shortAddress, toNumber } from "@/lib/format";

const SECONDS_PER_YEAR = 31_536_000;
const POLL_MS = 5000;

type Tab = "wallet" | "staking";

// Public client for reads (no wallet needed). Hardwired to TADA.
function publicClientFor() {
  return createPublicClient({
    chain: {
      id: TADA_CHAIN_ID,
      name: TADA_NETWORK_NAME,
      nativeCurrency: { name: TADA_NATIVE_SYMBOL, symbol: TADA_NATIVE_SYMBOL, decimals: 18 },
      rpcUrls: { default: { http: [TADA_RPC_URL] } },
    },
    transport: http(TADA_RPC_URL),
  });
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("wallet");

  const { address, isConnected } = useAccount();
  const { mutate: connect, isPending: connecting } = useConnect();
  const { mutate: disconnect } = useDisconnect();
  const chainId = useChainId();
  const { mutateAsync: writeContractAsync } = useWriteContract();

  // ── Wallet tab state ────────────────────────────────────────────────
  const [nativeBalance, setNativeBalance] = useState<bigint | undefined>(undefined);
  const [tokenBalances, setTokenBalances] = useState<(bigint | undefined)[]>([]);

  // ── Staking tab state ───────────────────────────────────────────────
  const [pid, setPid] = useState(0);
  const [mvlPerBlock, setMvlPerBlock] = useState<bigint | undefined>(undefined);
  const [startBlock, setStartBlock] = useState<bigint | undefined>(undefined);
  const [endBlock, setEndBlock] = useState<bigint | undefined>(undefined);
  const [currentBlock, setCurrentBlock] = useState<bigint | undefined>(undefined);
  const [totalStaked, setTotalStaked] = useState<bigint | undefined>(undefined);
  const [depositTokenAddr, setDepositTokenAddr] = useState<`0x${string}` | undefined>(undefined);
  const [staked, setStaked] = useState<bigint | undefined>(undefined);
  const [stakeWalletBalance, setStakeWalletBalance] = useState<bigint | undefined>(undefined);
  const [allowance, setAllowance] = useState<bigint | undefined>(undefined);
  const [pendingReward, setPendingReward] = useState<bigint | undefined>(undefined);

  // form
  const [mode, setMode] = useState<"stake" | "unstake">("stake");
  const [amount, setAmount] = useState("");
  const [txMsg, setTxMsg] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // ── Wallet balances via individual reads ────────────────────────────
  async function loadWallet() {
    if (!address) return;
    try {
      const client = publicClientFor();
      const tokens = TADA_TOKENS;
      const native = await client.getBalance({ address });
      const results: bigint[] = [];
      for (const t of tokens) {
        const bal = await client.readContract({
          address: t.address,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address],
        }) as bigint;
        results.push(bal);
      }
      setNativeBalance(native);
      setTokenBalances(results);
    } catch (e) {
      console.error(e);
    }
  }

  // ── Pool + user data via individual reads ───────────────────────────
  async function loadPool() {
    const chef = TADA_MASTERCHEF_ADDRESS;
    try {
      const client = publicClientFor();
      const base = { address: chef, abi: masterChefAbi } as const;
      const block = await client.getBlockNumber();

      const poolInfo = await client.readContract({
        ...base,
        functionName: "poolInfo",
        args: [BigInt(pid)],
      }) as readonly [`0x${string}`, bigint, bigint, bigint];

      const perBlock = await client.readContract({
        ...base,
        functionName: "mvlPerBlock",
      }) as bigint;

      const sBlock = await client.readContract({
        ...base,
        functionName: "startBlock",
      }) as bigint;

      const eBlock = await client.readContract({
        ...base,
        functionName: "endBlock",
      }) as bigint;

      const lpToken = poolInfo[0];

      const totStaked = await client.readContract({
        address: lpToken,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [chef],
      }) as bigint;

      setDepositTokenAddr(lpToken);
      setMvlPerBlock(perBlock);
      setStartBlock(sBlock);
      setEndBlock(eBlock);
      setCurrentBlock(block);
      setTotalStaked(totStaked);

      if (address) {
        const userInfo = await client.readContract({
          ...base,
          functionName: "userInfo",
          args: [BigInt(pid), address],
        }) as readonly [bigint, bigint];

        const bal = await client.readContract({
          address: lpToken,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address],
        }) as bigint;

        const allow = await client.readContract({
          address: lpToken,
          abi: erc20Abi,
          functionName: "allowance",
          args: [address, chef],
        }) as bigint;

        const pending = await client.readContract({
          ...base,
          functionName: "pendingMvl",
          args: [BigInt(pid), address],
        }) as bigint;

        setStaked(userInfo[0]);
        setStakeWalletBalance(bal);
        setAllowance(allow);
        setPendingReward(pending);
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Load on connect / chain change / pool change.
  useEffect(() => {
    if (isConnected) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadWallet();
      loadPool();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, chainId, pid]);

  // Keep rewards/balances live with a manual poll.
  useEffect(() => {
    setInterval(() => {
      loadWallet();
      loadPool();
    }, POLL_MS);
    // no cleanup — interval keeps refreshing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── APR ─────────────────────────────────────────────────────────────
  let apr: number | null = null;
  if (mvlPerBlock !== undefined && totalStaked !== undefined && totalStaked > 0n) {
    const blocksPerYear = SECONDS_PER_YEAR / TADA_BLOCK_TIME_SECONDS;
    const annual = Number(mvlPerBlock) * blocksPerYear;
    const stakedValue = Number(totalStaked) * APR_DEPOSIT_TOKEN_VALUE;
    apr = (annual / stakedValue) * 100;
    if (!Number.isFinite(apr)) apr = null;
  }
  const windowActive =
    currentBlock !== undefined &&
    startBlock !== undefined &&
    endBlock !== undefined &&
    currentBlock >= startBlock &&
    currentBlock < endBlock;

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

  // ── actions ─────────────────────────────────────────────────────────
  async function handleStake() {
    const chef = TADA_MASTERCHEF_ADDRESS;
    if (parsed === undefined || !depositTokenAddr || !address) return;
    // approve first if needed, then deposit right after
    if (needsApprove) {
      await writeContractAsync({
        address: depositTokenAddr,
        abi: erc20Abi,
        functionName: "approve",
        args: [chef, maxUint256],
      });
    }
    const hash = await writeContractAsync({
      address: chef,
      abi: masterChefAbi,
      functionName: "deposit",
      args: [BigInt(pid), parsed, address],
    });
    setTxHash(hash);
    setTxMsg("Deposit submitted");
    setAmount("");
    loadPool();
  }

  async function handleWithdraw(withHarvest: boolean) {
    const chef = TADA_MASTERCHEF_ADDRESS;
    if (parsed === undefined || !address) return;
    const fn = withHarvest ? "withdrawAndHarvest" : "withdraw";
    const hash = await writeContractAsync({
      address: chef,
      abi: masterChefAbi,
      functionName: fn,
      args: [BigInt(pid), parsed, address],
    });
    setTxHash(hash);
    setTxMsg(withHarvest ? "Withdraw + harvest submitted" : "Withdraw submitted");
    setAmount("");
    loadPool();
  }

  async function handleHarvest() {
    const chef = TADA_MASTERCHEF_ADDRESS;
    if (!address) return;
    const hash = await writeContractAsync({
      address: chef,
      abi: masterChefAbi,
      functionName: "harvest",
      args: [BigInt(pid), address],
    });
    setTxHash(hash);
    setTxMsg("Harvest submitted");
    loadPool();
  }

  const tokens = TADA_TOKENS;
  const stakingSupported = chainId === TADA_CHAIN_ID;
  const explorer = TADA_EXPLORER_URL;

  // ── render ──────────────────────────────────────────────────────────
  return (
    <div className="app">
      <header>
        <div className="brand">MVL dApp</div>
        <div className="chips">
          <div className="net-pill-wrap">
            <span className="net-pill">
              <span className="net-pill-name">{TADA_NETWORK_NAME}</span>
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
            ) : (
              <>
                <div className="bal-block">
                  <div className="k">Native balance</div>
                  <div className="v big">
                    {formatAmount(nativeBalance)} <small>{TADA_NATIVE_SYMBOL}</small>
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
                <div className="banner-text">Staking is hardwired to TADA in this starter.</div>
              </div>
            ) : !isConnected ? (
              <section className="card">
                <p className="empty">Connect your wallet to stake.</p>
              </section>
            ) : (
              <>
                {TADA_TOKENS.length > 1 && (
                  <div className="pool-tabs">
                    <button className={pid === 0 ? "active" : ""} onClick={() => setPid(0)}>
                      Pool 0
                    </button>
                    <button className={pid === 1 ? "active" : ""} onClick={() => setPid(1)}>
                      Pool 1
                    </button>
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
        {TADA_NETWORK_NAME} · Chain {chainId}
      </footer>
    </div>
  );
}
