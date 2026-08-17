import type { PoolConfig } from "@/lib/config";

type PoolSelectorProps = {
  pools: PoolConfig[];
  pid: number;
  onSelect: (pid: number) => void;
};

export function PoolSelector({ pools, pid, onSelect }: PoolSelectorProps) {
  if (pools.length <= 1) return null;

  return (
    <div className="pool-tabs">
      {pools.map((pool) => (
        <button
          key={pool.pid}
          type="button"
          className={pid === pool.pid ? "active" : ""}
          onClick={() => onSelect(pool.pid)}
        >
          {pool.label}
        </button>
      ))}
    </div>
  );
}
