# Changes Implemented

**Date:** August 2026  
**Related:** [`AUDIT.md`](AUDIT.md) (baseline audit — preserved as-is)

This document records what was implemented during the hardening pass, mapped to the baseline issues and assignment requirements.

---

## 1. Summary

The inherited single-chain, monolithic dApp was refactored into a multi-network architecture with separated hooks/components, robust transaction flow, correct APR math, and documentation updates.

| Network | Chain ID | Wallet | Staking |
|---------|----------|--------|---------|
| TADA Protocol Testnet | 31451 | Yes | Yes |
| MVL Testnet | 8453200012 | Yes | Yes |
| Ethereum Sepolia | 11155111 | Yes | No |

---

## 2. Architecture (after)

```
app/
  page.tsx              # ~220 lines: tab shell, hooks, handlers
  providers.tsx         # wagmi (3 chains) + react-query
components/
  Header.tsx            # connect + network switcher
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
  config/chains.ts      # per-chain RPC, tokens, staking, APR assumptions
  config/index.ts
  contracts.ts          # ABIs only
  apr.ts
  format.ts
  publicClient.ts
  networks.ts           # legacy TADA re-exports
scripts/
  setup-wallet.ts       # TADA faucet + MVL wallet generation
```

---

## 3. Fixes by baseline issue

| ID | Issue | Resolution |
|----|-------|------------|
| C1 | Stale polling closures | `usePollCallback` + `refetch` with correct deps in read hooks |
| C2 | No interval cleanup | `clearInterval` on unmount; skip poll when disconnected/hidden |
| C3 | No tx confirmation/errors | `useContractTx`: signing → confirming → success/error + receipt wait |
| C4 | Reads ignore wallet chain | `createChainPublicClient(getChainConfig(chainId))` in hooks |
| H1 | APR ignores allocPoint | `lib/apr.ts` uses `mvlPerBlock * allocPoint / totalAllocPoint` |
| H2 | Wrong pool 1 value units | Per-pool `depositTokenValueUnits` / `rewardTokenValueUnits` in chain config |
| H3 | `parseAmount` precision loss | viem `parseUnits` (string-based) |
| H4 | `Number(bigint)` in APR | BigInt math in `calculateApr`; `Number` only at final percentage |
| H5 | Async read races | Request ID guard in `useWalletBalances` / `useStakingPool` |
| H6 | Approve → deposit race | Wait for approve receipt before deposit in `useContractTx.stake` |
| M1 | No write pending state | Buttons disabled during `isTxPending`; harvest gated on reward > 0 |
| M2 | Inconsistent APR window | All pools show `0.00%` outside reward window |
| M3 | Staked shown as raw wei | `formatAmount(staked, depositDecimals)` |
| M4 | Read errors only logged | Error banners in wallet/staking tabs |
| M5 | No read loading state | "Loading balances…" / "Loading pool data…" messages |
| M6 | Stale state on disconnect | Hooks clear state when address/chain unavailable |
| M7 | No chain-switch UX | `NetworkSwitcher` with `useSwitchChain` |
| M8 | Missing `address` dep | Read hooks depend on `address` via `refetch` callback deps |
| M9 | Env vars not wired | `lib/config/chains.ts` reads `NEXT_PUBLIC_*` overrides |
| L1 | Decimals ignored | Per-token decimals in `formatAmount` / `parseAmount` (USDC = 6) |
| L2 | Config duplication | Single source in `lib/config/chains.ts`; ABIs only in `contracts.ts` |
| L3 | `viem` in devDependencies | Moved to `dependencies` |
| L4 | Poll when disconnected | Polling gated on `isConnected` / chain availability |
| L5 | Hardcoded pool tabs | `PoolSelector` driven by chain config pools |
| L6 | MetaMask-only | Unchanged (documented as intentional) |
| L7 | README outdated | README rewritten for three networks |

---

## 4. New files

| File | Purpose |
|------|---------|
| `lib/config/chains.ts` | TADA, MVL, Sepolia chain definitions |
| `lib/config/index.ts` | `getChainConfig`, `isStakingSupported`, helpers |
| `lib/apr.ts` | APR calculation |
| `lib/errors.ts` | Sanitized user-facing error messages |
| `lib/publicClient.ts` | Chain-scoped public client factory |
| `hooks/useWalletBalances.ts` | Wallet balance reads |
| `hooks/useStakingPool.ts` | Pool + user staking reads |
| `hooks/useContractTx.ts` | Transaction lifecycle |
| `hooks/usePollCallback.ts` | Shared polling with cleanup |
| `components/*` | UI component split |

---

## 5. Intentionally not implemented

Same as [`AUDIT.md` §6](AUDIT.md#6-intentionally-left-out-and-why):

- Send/receive flows
- Sepolia staking
- Generic injected wallet (non-MetaMask)
- Multicall3 batching
- Dynamic `poolLength()` discovery
- Visual redesign

**Additional trade-offs:**

- React Query provider remains; reads use custom hooks instead of `useReadContract`
- MVL Testnet has no automated faucet in `setup:wallet` (manual funding documented)

---

## 6. Security hardening

| Item | Implementation |
|------|----------------|
| **Exact-amount approve** | `approve(spender, amount)` for the stake amount only — no `maxUint256` |
| **Pre-flight simulation** | `simulateContract` before every write in `useContractTx` |
| **Chain guard on writes** | Rejects txs when wallet chain is unsupported or staking is unavailable |
| **Env address validation** | `isAddress` + `getAddress` checksum in `lib/config/chains.ts`; invalid env falls back with `console.warn` |
| **Sanitized error messages** | `lib/errors.ts` — no raw RPC errors in UI |
| **Security headers** | CSP, `X-Frame-Options`, `X-Content-Type-Options`, etc. in `next.config.ts` |
| **Faucet URL** | Moved to `TADA_FAUCET_URL` env (server-side script only, not in client bundle) |

**Residual risks (documented, not eliminated):**

- **RPC trust** — reads and simulations depend on configured public RPC endpoints. Override via `NEXT_PUBLIC_*_RPC_URL` for trusted providers.
- **Contract trust** — users approve the configured MasterChef; verify addresses in `.env` / `lib/config/chains.ts` before deployment.
- **Testnet keys** — `setup:wallet` prints private keys to the terminal (disposable testnet only).

---

## 7. Documentation updates

| File | Changes |
|------|---------|
| `README.md` | Three-network setup, layout, notes |
| `.env.example` | TADA, MVL, Sepolia env vars |
| `scripts/setup-wallet.ts` | Shared config; `--network mvl` flag |
| `AUDIT.md` | Restored as baseline audit (this file holds implementation details) |

---

## 8. Verification

**Automated (passed):**

```bash
npm run build   # ✓
npm run lint    # ✓
```

**Manual smoke-test checklist** (requires MetaMask + testnet funds):

| # | Test | TADA | MVL | Sepolia |
|---|------|------|-----|---------|
| 1 | Connect wallet | ☐ | ☐ | ☐ |
| 2 | Switch network via header dropdown | ☐ | ☐ | ☐ |
| 3 | Wallet tab: native balance loads | ☐ | ☐ | ☐ |
| 4 | Wallet tab: ERC20 balances load | ☐ | ☐ | ☐ |
| 5 | Staking tab: pool data + APR display | ☐ | ☐ | n/a |
| 6 | Stake (approve + deposit) → confirmed banner | ☐ | ☐ | n/a |
| 7 | Harvest → confirmed banner | ☐ | ☐ | n/a |
| 8 | Withdraw / withdraw+harvest → confirmed | ☐ | ☐ | n/a |
| 9 | Reject signature → error banner, buttons re-enabled | ☐ | ☐ | n/a |
| 10 | Sepolia staking tab shows “not available” message | n/a | n/a | ☐ |

> Run locally before submission; CI cannot sign MetaMask transactions.

---

## 9. Suggested commit grouping (reference)

If splitting commits for review:

1. `docs: add baseline engineering audit (AUDIT.md)`
2. `refactor: add multi-chain config for TADA, MVL, and Sepolia`
3. `feat: register three chains in wagmi config`
4. `feat: add chain-scoped wallet and staking read hooks`
5. `feat: add transaction hook with receipt wait and error handling`
6. `fix: use parseUnits and per-token decimals`
7. `fix: correct APR with allocPoint weighting`
8. `refactor: split UI into components and add network switcher`
9. `docs: update README, env example, and setup script`
10. `docs: add CHANGES-IMPLEMENTED.md and finalize verification`
