import type { TokenConfig } from "@/lib/config";
import { formatAmount } from "@/lib/format";

type WalletTabProps = {
  isConnected: boolean;
  hasChain: boolean;
  isLoading: boolean;
  error: string | null;
  nativeBalance: bigint | undefined;
  nativeSymbol: string;
  nativeDecimals: number;
  tokens: TokenConfig[];
  tokenBalances: bigint[];
};

export function WalletTab({
  isConnected,
  hasChain,
  isLoading,
  error,
  nativeBalance,
  nativeSymbol,
  nativeDecimals,
  tokens,
  tokenBalances,
}: WalletTabProps) {
  return (
    <section className="card">
      {!isConnected ? (
        <p className="empty">Connect your wallet to view balances.</p>
      ) : !hasChain ? (
        <p className="empty">Switch to a supported network to view balances.</p>
      ) : (
        <>
          {error && (
            <div className="banner banner-info">
              <div className="banner-text">{error}</div>
            </div>
          )}
          {isLoading && nativeBalance === undefined && !error && (
            <p className="empty">Loading balances…</p>
          )}
          <div className="bal-block">
            <div className="k">Native balance</div>
            <div className="v big">
              {formatAmount(nativeBalance, nativeDecimals)} <small>{nativeSymbol}</small>
            </div>
          </div>
          <div className="token-list">
            {tokens.map((t, i) => (
              <div className="token-row" key={t.address}>
                <span className="token-sym">{t.symbol}</span>
                <span className="token-bal">{formatAmount(tokenBalances[i], t.decimals)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
