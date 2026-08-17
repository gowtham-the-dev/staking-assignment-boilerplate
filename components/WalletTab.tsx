"use client";

import { useState } from "react";
import { Copy, ExternalLink, Info } from "lucide-react";
import type { TokenConfig } from "@/lib/config";
import { formatAmount } from "@/lib/format";
import { TokenIcon, tokenDisplayName } from "@/components/icons/TokenIcon";

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
  networkName: string;
  address: string | undefined;
  explorerUrl: string;
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
  networkName,
  address,
  explorerUrl,
}: WalletTabProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopyAddress() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  if (!isConnected) {
    return <p className="empty">Connect your wallet to view balances.</p>;
  }

  if (!hasChain) {
    return <p className="empty">Switch to a supported network to view balances.</p>;
  }

  return (
    <>
      <div className="page-head">
        <div className="page-head-row">
          <div>
            <h1 className="page-title">Asset Portfolio</h1>
            <p className="page-sub">Overview of your holdings on {networkName}</p>
          </div>
          <button
            type="button"
            className="info-btn"
            title="Read-only wallet — view balances and copy your address"
            aria-label="Read-only wallet info"
          >
            <Info size={14} />
          </button>
        </div>
      </div>

      {error && (
        <div className="banner banner-info">
          <div className="banner-text">{error}</div>
        </div>
      )}

      {isLoading && nativeBalance === undefined && !error ? (
        <p className="empty">Loading balances…</p>
      ) : (
        <>
          <div className="native-card">
            <div className="k">Native Balance</div>
            <div className="v big">
              {formatAmount(nativeBalance, nativeDecimals, 4)}{" "}
              <small>{nativeSymbol}</small>
            </div>
          </div>

          <section className="assets-section">
            <div className="section-head">
              <span className="k">My Assets</span>
              <span className="badge">{tokens.length} Tokens</span>
            </div>
            <div className="asset-list">
              {tokens.map((t, i) => (
                <div className="asset-row" key={t.address}>
                  <div className="asset-left">
                    <TokenIcon symbol={t.symbol} />
                    <div>
                      <div className="asset-name">{tokenDisplayName(t.symbol)}</div>
                      <div className="asset-sym">{t.symbol}</div>
                    </div>
                  </div>
                  <div className="asset-right">
                    <div className="asset-bal">
                      {formatAmount(tokenBalances[i], t.decimals, 2)}
                    </div>
                    <div className="asset-bal-sym">{t.symbol}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {address && (
            <div className="quick-links">
              {explorerUrl ? (
                <a
                  className="quick-link"
                  href={`${explorerUrl}/address/${address}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="quick-link-icon" size={16} />
                  <div className="quick-link-title">Explorer</div>
                  <div className="quick-link-desc">
                    View your wallet address on the block explorer
                  </div>
                </a>
              ) : (
                <div className="quick-link" aria-disabled>
                  <ExternalLink className="quick-link-icon" size={16} />
                  <div className="quick-link-title">Explorer</div>
                  <div className="quick-link-desc">No explorer configured for this network</div>
                </div>
              )}
              <button
                type="button"
                className={`quick-link${copied ? " quick-link--copied" : ""}`}
                onClick={handleCopyAddress}
              >
                <Copy className="quick-link-icon" size={16} />
                <div className="quick-link-title">{copied ? "Copied!" : "Address"}</div>
                <div className="quick-link-desc">Copy your public address to clipboard</div>
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
