type Tab = "wallet" | "staking";

type AppTabsProps = {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  stakingSupported: boolean;
  className?: string;
};

export function AppTabs({
  activeTab,
  onTabChange,
  stakingSupported,
  className = "seg",
}: AppTabsProps) {
  return (
    <div className={className}>
      <button
        type="button"
        className={activeTab === "wallet" ? "active" : ""}
        onClick={() => onTabChange("wallet")}
      >
        Wallet
      </button>
      <button
        type="button"
        className={activeTab === "staking" ? "active" : ""}
        onClick={() => onTabChange("staking")}
        disabled={!stakingSupported}
        title={!stakingSupported ? "Staking not available on this network" : undefined}
      >
        Staking
      </button>
    </div>
  );
}

export type { Tab };
