"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { shortAddress } from "@/lib/format";
import { NetworkSwitcher } from "./NetworkSwitcher";

export function Header() {
  const { address, isConnected } = useAccount();
  const { mutate: connect, isPending: connecting } = useConnect();
  const { mutate: disconnect } = useDisconnect();

  return (
    <header>
      <div className="brand">MVL dApp</div>
      <div className="chips">
        <NetworkSwitcher />
        {isConnected ? (
          <button className="chip" type="button" onClick={() => disconnect()}>
            {shortAddress(address)}
          </button>
        ) : (
          <button
            className="chip"
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
