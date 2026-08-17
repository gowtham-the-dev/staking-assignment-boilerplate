import {
  ArrowUpRight,
  Clock,
  Info,
  TriangleAlert,
  Wallet,
  Zap,
} from "lucide-react";
import type { PoolConfig } from "@/lib/config";
import type { TxPhase } from "@/hooks/useContractTx";
import { formatAmount, toFullPrecision } from "@/lib/format";
import { PoolSelector } from "./PoolSelector";
import { TxBanner } from "./TxBanner";

type StakeMode = "stake" | "unstake";

type StakingTabProps = {
  networkName: string;
  stakingSupported: boolean;
  isConnected: boolean;
  pools: PoolConfig[];
  pid: number;
  onPidChange: (pid: number) => void;
  poolLabel: string;
  poolError: string | null;
  poolLoading: boolean;
  hasPoolData: boolean;
  pendingReward: bigint | undefined;
  rewardDecimals: number;
  rewardSymbol: string;
  depositSymbol: string;
  apr: number | null;
  canHarvest: boolean;
  isTxPending: boolean;
  onHarvest: () => void;
  stakeWalletBalance: bigint | undefined;
  staked: bigint | undefined;
  totalStaked: bigint | undefined;
  depositDecimals: number;
  mode: StakeMode;
  onModeChange: (mode: StakeMode) => void;
  amount: string;
  onAmountChange: (value: string) => void;
  balanceForMode: bigint | undefined;
  validationMsg: string | null;
  canAct: boolean;
  needsApprove: boolean;
  onStake: () => void;
  onWithdraw: (withHarvest: boolean) => void;
  txPhase: TxPhase;
  txMsg: string | null;
  txHash: string | null;
  explorerUrl: string;
  onDismissTx: () => void;
};

export function StakingTab({
  networkName,
  stakingSupported,
  isConnected,
  pools,
  pid,
  onPidChange,
  poolLabel,
  poolError,
  poolLoading,
  hasPoolData,
  pendingReward,
  rewardDecimals,
  rewardSymbol,
  depositSymbol,
  apr,
  canHarvest,
  isTxPending,
  onHarvest,
  stakeWalletBalance,
  staked,
  totalStaked,
  depositDecimals,
  mode,
  onModeChange,
  amount,
  onAmountChange,
  balanceForMode,
  validationMsg,
  canAct,
  needsApprove,
  onStake,
  onWithdraw,
  txPhase,
  txMsg,
  txHash,
  explorerUrl,
  onDismissTx,
}: StakingTabProps) {
  if (!stakingSupported) {
    return (
      <div className="banner banner-info">
        <div className="banner-text">
          Staking is not available on {networkName}. Switch to TADA or MVL Testnet.
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return <p className="empty">Connect your wallet to stake.</p>;
  }

  return (
    <>
      <div className="staking-terminal-head">
        <Zap className="terminal-icon" size={16} />
        <h2>Staking Terminal</h2>
      </div>

      {poolError && (
        <div className="banner banner-info">
          <div className="banner-text">{poolError}</div>
        </div>
      )}

      {poolLoading && !hasPoolData && !poolError && (
        <p className="empty">Loading pool data…</p>
      )}

      <PoolSelector pools={pools} pid={pid} onSelect={onPidChange} />

      <section className="pool-card">
        <div className="pool-head">
          <div>
            <h3 className="pool-head-title">{poolLabel}</h3>
            <p className="pool-head-sub">Deposit assets to earn protocol rewards</p>
          </div>
          <span className="status-badge">Active</span>
        </div>

        <div className="reward-block">
          <div className="label">Pending Reward</div>
          <div className="big">
            {formatAmount(pendingReward, rewardDecimals, 4)}{" "}
            <small>{rewardSymbol}</small>
          </div>
          <span className="apr-pill">
            APR {apr !== null ? `${apr.toFixed(2)}%` : "0.00%"}
            <Info size={12} />
          </span>
          <button
            className="btn btn-primary harvest-btn"
            type="button"
            onClick={onHarvest}
            disabled={!canHarvest}
          >
            {isTxPending ? "Processing…" : "Harvest Rewards"}
          </button>
        </div>

        <div className="stats-grid">
          <div className="stat-cell">
            <div className="k">
              <Wallet size={12} />
              Wallet Balance
            </div>
            <div className="v">
              {formatAmount(stakeWalletBalance, depositDecimals, 0)}{" "}
              <small>{depositSymbol}</small>
            </div>
          </div>
          <div className="stat-cell">
            <div className="k">
              <Clock size={12} />
              My Staked
            </div>
            <div className="v">
              {formatAmount(staked, depositDecimals, 0)} <small>{depositSymbol}</small>
            </div>
          </div>
        </div>

        <div className="protocol-row">
          <span className="k">Protocol Total Staked</span>
          <span className="v">
            {formatAmount(totalStaked, depositDecimals, 4)} {depositSymbol}
          </span>
        </div>

        <div className="stake-form">
          <div className="seg">
            <button
              type="button"
              className={mode === "stake" ? "active" : ""}
              onClick={() => onModeChange("stake")}
            >
              Stake
            </button>
            <button
              type="button"
              className={mode === "unstake" ? "active" : ""}
              onClick={() => onModeChange("unstake")}
            >
              Unstake
            </button>
          </div>

          <div className="field-label-row">
            <span className="field-label">
              {mode === "stake" ? "Amount to Stake" : "Amount to Unstake"}
            </span>
            <span className="field-available">
              Available: {formatAmount(balanceForMode, depositDecimals, 0)}
            </span>
          </div>

          <div className="field">
            <input
              value={amount}
              inputMode="decimal"
              placeholder="0.0"
              onChange={(e) => onAmountChange(e.target.value)}
            />
            <button
              className="max"
              type="button"
              onClick={() =>
                balanceForMode !== undefined &&
                onAmountChange(toFullPrecision(balanceForMode, depositDecimals))
              }
            >
              MAX
            </button>
          </div>

          {validationMsg && <div className="validation">{validationMsg}</div>}

          {mode === "stake" ? (
            <button className="btn btn-primary mt-10" type="button" onClick={onStake} disabled={!canAct}>
              <ArrowUpRight size={16} />
              {isTxPending ? "Processing…" : needsApprove ? "Approve & Stake" : "Confirm Stake"}
            </button>
          ) : (
            <div className="btn-row mt-10">
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => onWithdraw(false)}
                disabled={!canAct}
              >
                {isTxPending ? "Processing…" : "Withdraw"}
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => onWithdraw(true)}
                disabled={!canAct}
              >
                {isTxPending ? "Processing…" : "Withdraw + Harvest"}
              </button>
            </div>
          )}

          <div className="warning-box">
            <TriangleAlert size={16} />
            <p>
              Staking involves protocol risk. Rewards depend on pool allocation and emission
              schedule. Understand unbonding periods and smart contract risks before confirming
              transactions.
            </p>
          </div>
        </div>
      </section>

      <TxBanner
        phase={txPhase}
        message={txMsg}
        hash={txHash}
        explorerUrl={explorerUrl}
        onDismiss={onDismissTx}
      />
    </>
  );
}
