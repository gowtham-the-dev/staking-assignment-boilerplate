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
  poolError: string | null;
  poolLoading: boolean;
  hasPoolData: boolean;
  pendingReward: bigint | undefined;
  rewardDecimals: number;
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
  poolError,
  poolLoading,
  hasPoolData,
  pendingReward,
  rewardDecimals,
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
    return (
      <section className="card">
        <p className="empty">Connect your wallet to stake.</p>
      </section>
    );
  }

  return (
    <>
      {poolError && (
        <div className="banner banner-info">
          <div className="banner-text">{poolError}</div>
        </div>
      )}
      {poolLoading && !hasPoolData && !poolError && (
        <p className="empty">Loading pool data…</p>
      )}

      <PoolSelector pools={pools} pid={pid} onSelect={onPidChange} />

      <section className="hero">
        <div className="reward">
          <div className="label">Pending reward</div>
          <div className="big">{formatAmount(pendingReward, rewardDecimals)}</div>
        </div>
        <div className="apr">
          <div className="label">APR</div>
          <div className="v">{apr !== null ? `${apr.toFixed(2)}%` : "0.00%"}</div>
        </div>
        <button
          className="btn btn-claim"
          type="button"
          onClick={onHarvest}
          disabled={!canHarvest}
        >
          {isTxPending ? "Processing…" : "Harvest"}
        </button>
      </section>

      <div className="stats">
        <div className="stat">
          <div className="k">Wallet balance</div>
          <div className="v">{formatAmount(stakeWalletBalance, depositDecimals)}</div>
        </div>
        <div className="stat">
          <div className="k">Staked</div>
          <div className="v">{formatAmount(staked, depositDecimals)}</div>
        </div>
        <div className="stat">
          <div className="k">Total staked</div>
          <div className="v">{formatAmount(totalStaked, depositDecimals)}</div>
        </div>
      </div>

      <section className="card">
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

        <div className="bal-hint">
          <span>{mode === "stake" ? "Available to stake" : "Available to unstake"}</span>
          <span>{formatAmount(balanceForMode, depositDecimals)}</span>
        </div>

        {validationMsg && <div className="validation">{validationMsg}</div>}

        {mode === "stake" ? (
          <button className="btn btn-primary" type="button" onClick={onStake} disabled={!canAct}>
            {isTxPending ? "Processing…" : needsApprove ? "Approve & Stake" : "Stake"}
          </button>
        ) : (
          <div className="btn-row">
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
              {isTxPending ? "Processing…" : "Withdraw + harvest"}
            </button>
          </div>
        )}
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
