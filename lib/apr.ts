import type { PoolConfig } from "@/lib/config";

const SECONDS_PER_YEAR = 31_536_000;

export type AprInputs = {
  mvlPerBlock: bigint;
  allocPoint: bigint;
  totalAllocPoint: bigint;
  totalStaked: bigint;
  blockTimeSeconds: number;
  poolConfig: PoolConfig;
  windowActive: boolean;
};

/**
 * APR = annual reward value / deposited value * 100
 *
 * poolRewardPerBlock = mvlPerBlock * allocPoint / totalAllocPoint
 * annualRewardWei = poolRewardPerBlock * blocksPerYear
 * annualRewardValue = annualRewardWei * rewardTokenValueUnits
 * depositedValue = totalStaked * depositTokenValueUnits
 */
export function calculateApr({
  mvlPerBlock,
  allocPoint,
  totalAllocPoint,
  totalStaked,
  blockTimeSeconds,
  poolConfig,
  windowActive,
}: AprInputs): number | null {
  if (!windowActive) return null;
  if (totalStaked <= 0n) return null;
  if (totalAllocPoint <= 0n) return null;
  if (blockTimeSeconds <= 0) return null;

  const poolRewardPerBlock = (mvlPerBlock * allocPoint) / totalAllocPoint;
  const blocksPerYear = BigInt(Math.floor(SECONDS_PER_YEAR / blockTimeSeconds));
  const annualRewardWei = poolRewardPerBlock * blocksPerYear;

  const rewardUnits = BigInt(poolConfig.rewardTokenValueUnits);
  const depositUnits = BigInt(poolConfig.depositTokenValueUnits);
  const numerator = annualRewardWei * rewardUnits * 100n;
  const denominator = totalStaked * depositUnits;

  if (denominator === 0n) return null;

  const apr = Number(numerator) / Number(denominator);
  return Number.isFinite(apr) ? apr : null;
}
