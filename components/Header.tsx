"use client";

import { useState, useEffect, useRef } from "react";
import { Wallet } from "lucide-react";
import { useConnect, useConnection, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { shortAddress } from "@/lib/format";
import { AppTabs } from "./AppTabs";
import { NetworkSwitcher } from "./NetworkSwitcher";
import type { Tab } from "./AppTabs";

type HeaderProps = {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  stakingSupported: boolean;
};

export function Header({ activeTab, onTabChange, stakingSupported }: HeaderProps) {
  const { address, isConnected } = useConnection();
  const { mutate: connect, isPending: connecting } = useConnect();
  const { mutate: disconnect } = useDisconnect();
  const [walletOpen, setWalletOpen] = useState(false);
  const walletRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!walletOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (walletRef.current && !walletRef.current.contains(event.target as Node)) {
        setWalletOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [walletOpen]);

  function handleDisconnect() {
    disconnect();
    setWalletOpen(false);
  }

  return (
    <header>
      <div className="brand">
        <Wallet className="brand-icon" size={18} strokeWidth={2.5} />
        MVL dApp
      </div>

      <AppTabs
        activeTab={activeTab}
        onTabChange={onTabChange}
        stakingSupported={stakingSupported}
        className="header-tabs seg"
      />

      <div className="chips">
        <NetworkSwitcher />
        {isConnected ? (
          <div className="wallet-pill-wrap" ref={walletRef}>
            <button
              className="chip wallet"
              type="button"
              onClick={() => setWalletOpen((v) => !v)}
              aria-expanded={walletOpen}
              aria-haspopup="menu"
            >
              <span className="chip-avatar" aria-hidden />
              {shortAddress(address)}
            </button>
            {walletOpen && (
              <div className="wallet-dropdown" role="menu">
                <div className="wallet-dropdown-label">Connected</div>
                <div className="wallet-dropdown-addr">{address}</div>
                <button
                  className="wallet-dropdown-disconnect"
                  type="button"
                  role="menuitem"
                  onClick={handleDisconnect}
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            className="chip wallet"
            type="button"
            onClick={() => connect({ connector: injected({ target: "metaMask" }) })}
            disabled={connecting}
          >
            {connecting ? "Connecting…" : "Connect Wallet"}
          </button>
        )}
      </div>
    </header>
  );
}
