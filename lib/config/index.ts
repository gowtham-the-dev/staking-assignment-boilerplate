import {
  CHAIN_BY_ID,
  type ChainDefinition,
  type PoolConfig,
  type StakingConfig,
} from "./chains";

export {
  CHAIN_BY_ID,
  SUPPORTED_CHAINS,
  mvlChain,
  sepoliaChain,
  tadaChain,
  type ChainDefinition,
  type PoolConfig,
  type StakingConfig,
  type TokenConfig,
} from "./chains";

export function getChainConfig(chainId: number | undefined): ChainDefinition | undefined {
  if (chainId === undefined) return undefined;
  return CHAIN_BY_ID[chainId];
}

export function isStakingSupported(chainId: number | undefined): boolean {
  const chain = getChainConfig(chainId);
  return chain?.staking !== undefined;
}

export function getStakingConfig(chainId: number | undefined): StakingConfig | undefined {
  return getChainConfig(chainId)?.staking;
}

export function getPoolConfig(
  chainId: number | undefined,
  pid: number,
): PoolConfig | undefined {
  const staking = getStakingConfig(chainId);
  if (!staking) return undefined;
  return staking.pools.find((pool) => pool.pid === pid);
}
