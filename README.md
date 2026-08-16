# MVL dApp — Wallet & Staking

A Next.js + TypeScript dApp with two tabs:

- **Wallet** — view native + token balances for the connected network.
- **Staking** — deposit / harvest / withdraw against the `MasterChefSingleEvent` contract.

Three networks are supported:

| Network | Chain ID | Wallet | Staking |
|---------|----------|--------|---------|
| TADA Protocol Testnet | 31451 | Yes | Yes |
| MVL Testnet | 8453200012 | Yes | Yes |
| Ethereum Sepolia | 11155111 | Yes | No |

Switch networks from the header dropdown after connecting MetaMask.

See [`AUDIT.md`](AUDIT.md) for the engineering audit, issues found, and intentional trade-offs.

---

## Requirements

- Node.js 20+
- MetaMask (or another injected wallet)

## Setup

```bash
npm install

# optional — defaults are baked into lib/config/chains.ts
cp .env.example .env

# create + fund a throwaway test wallet (TADA default)
npm run setup:wallet

# or generate a wallet for MVL Testnet (manual funding)
npm run setup:wallet -- --network mvl

npm run dev          # http://localhost:3000
```

> Keys printed by `setup:wallet` are disposable testnet-only keys. Do not reuse them elsewhere.

## Scripts

```bash
npm run dev          # dev server
npm run build        # production build
npm run start        # serve the production build
npm run lint         # ESLint
npm run setup:wallet # throwaway wallet (+ TADA faucet when available)
```

## Layout

```
app/
  page.tsx           # tab shell + hook orchestration
  providers.tsx      # wagmi (3 chains) + react-query
  layout.tsx
  globals.css
components/
  Header.tsx         # connect + network switcher
  NetworkSwitcher.tsx
  WalletTab.tsx
  StakingTab.tsx
  PoolSelector.tsx
  TxBanner.tsx
hooks/
  useWalletBalances.ts
  useStakingPool.ts
  useContractTx.ts
  usePollCallback.ts
lib/
  config/chains.ts # per-chain RPC, tokens, staking, APR assumptions
  config/index.ts
  contracts.ts       # ABIs only
  apr.ts             # APR calculation
  format.ts          # amount formatting
  publicClient.ts
  networks.ts        # legacy TADA re-exports
abi/                 # MasterChef + ERC20 ABIs
scripts/
  setup-wallet.ts    # faucet (TADA) + throwaway wallet
```

## Notes

- Reads use sequential `readContract` calls (no Multicall3 — required for MVL Testnet).
- Each pool's deposit token is read on-chain from `poolInfo(pid).lpToken`.
- Balances and pending rewards poll every 5s while connected.
- TADA `setup:wallet` uses a hosted faucet; MVL has no automated faucet in this repo — fund manually.
- Sepolia USDC uses 6 decimals; other tokens use 18.
