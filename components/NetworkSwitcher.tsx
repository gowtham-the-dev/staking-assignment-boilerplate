"use client";

import { useState, useEffect, useRef } from "react";
import { useChainId, useConnection, useSwitchChain } from "wagmi";
import { getChainConfig, SUPPORTED_CHAINS } from "@/lib/config";

export function NetworkSwitcher() {
  const chainId = useChainId();
  const { isConnected } = useConnection();
  const switchChain = useSwitchChain();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const chain = getChainConfig(chainId);
  const supported = chain !== undefined;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const pillClass = [
    "chip",
    "net-pill",
    !supported ? "net-pill--warn" : "",
    switchChain.isPending ? "net-pill--busy" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const label = chain?.name ?? (chainId ? `Chain ${chainId}` : "Network");

  return (
    <div className="net-pill-wrap" ref={wrapRef}>
      <button
        type="button"
        className={pillClass}
        onClick={() => isConnected && setOpen((v) => !v)}
        disabled={!isConnected || switchChain.isPending}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {supported && <span className="dot" />}
        {!supported && chainId > 0 && <span className="dot dot-bad" />}
        <span className="net-pill-name">{switchChain.isPending ? "Switching…" : label}</span>
        {isConnected && <span className="net-pill-caret">▾</span>}
      </button>
      {open && isConnected && (
        <div className="net-dropdown" role="listbox">
          {SUPPORTED_CHAINS.map((c) => (
            <button
              key={c.id}
              type="button"
              role="option"
              aria-selected={c.id === chainId}
              className={`net-dropdown-item${c.id === chainId ? " active" : ""}`}
              onClick={() => {
                if (c.id !== chainId) {
                  switchChain.mutate({ chainId: c.id });
                }
                setOpen(false);
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
