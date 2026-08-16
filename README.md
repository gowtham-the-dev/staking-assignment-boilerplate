# MVL dApp — Wallet & Staking

A Next.js + TypeScript dApp with two tabs:

- **Wallet** — view native + token balances for the connected network.
- **Staking** — deposit / harvest / withdraw against the `MasterChefSingleEvent` contract.

One EVM testnet is wired up:

- **TADA Protocol Testnet** — balances + staking.

---

## Requirements

- Node.js 20+
- A browser wallet (MetaMask or another injected wallet)

## Setup

```bash
npm install

# optional — addresses fall back to baked-in defaults if unset
cp .env.example .env

# create + fund a throwaway test wallet on TADA, then import the printed key into MetaMask
npm run setup:wallet

npm run dev          # http://localhost:3000
```

## Scripts

```bash
npm run dev          # dev server
npm run build        # production build
npm run start        # serve the production build
npm run lint         # ESLint
npm run setup:wallet # throwaway funded wallet on TADA
```

## Layout

```
app/
  page.tsx        # UI: tabs + wallet chrome + Wallet / Staking tabs (reads + writes)
  providers.tsx   # wagmi config (both chains) + react-query provider
  layout.tsx
  globals.css
lib/
  networks.ts     # per-chain lookups (rpc / tokens / masterchef / explorer)
  contracts.ts    # ABIs + address constants
  format.ts       # amount formatting helpers
abi/              # MasterChef + ERC20 ABIs
scripts/
  setup-wallet.ts # faucet + throwaway wallet
```

## Notes

- Reads (token balances, pool + user data) are fired as individual `readContract` calls against the public RPC.
- Each pool's deposit token is read on-chain from `poolInfo(pid).lpToken`.
- Balances and pending rewards refetch on a short interval to stay live.
