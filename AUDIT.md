# Staking dApp — Engineering Audit Report

**Date:** August 2026  
**Scope:** Inherited Next.js staking dApp boilerplate (pre-hardening baseline)  
**Auditor:** Take-home assignment review

---

## 1. What the app does

This is a single-page **Next.js 16** dApp with two tabs:

| Tab | Purpose |
|-----|---------|
| **Wallet** | Read-only view of native balance + configured ERC20 balances for the connected account |
| **Staking** | Deposit, harvest, withdraw, and withdraw+harvest against a `MasterChefSingleEvent` contract |

**Stack:** React 19, TypeScript, **wagmi v3** (connect + writes), **viem** (public client reads), **@tanstack/react-query** (provider only — reads do not use it).

**Network (baseline):** TADA Protocol Testnet (chain ID `31451`) is hardwired for reads and staking. The assignment also targets **MVL Testnet** and **Ethereum Sepolia** (wallet-only); those are not wired in the starter.

**Read pattern:** Manual `createPublicClient` + sequential `readContract` / `getBalance` calls in `app/page.tsx`. No Multicall3 (required for MVL Testnet compatibility).

**Write pattern:** `useWriteContract` → `writeContractAsync` for `approve`, `deposit`, `harvest`, `withdraw`, `withdrawAndHarvest`.

---

## 2. Current structure

```
app/
  page.tsx        # ~500 lines: UI, state, reads, writes, APR, validation
  providers.tsx   # wagmi config (single TADA chain) + React Query
  layout.tsx      # root layout
  globals.css     # dark-theme styles
lib/
  networks.ts     # TADA RPC, explorer, tokens, MasterChef, APR placeholder
  contracts.ts    # ABIs + duplicate address constants (mostly unused by UI)
  format.ts       # amount parse/format helpers
abi/
  MasterChefSingleEvent.json
  TestToken.json
scripts/
  setup-wallet.ts # disposable wallet + TADA faucet
```

**Data flow (baseline):**

1. User connects via MetaMask (`injected({ target: "metaMask" })`).
2. `useEffect` on connect/chain/pid change calls `loadWallet()` and `loadPool()`.
3. A separate `setInterval` (5s) also calls those loaders — but with a stale closure bug (see below).
4. Staking actions call `writeContractAsync`; UI shows "submitted" on hash return without waiting for confirmation.

---

## 3. Issues found

Severity: **Critical** → **High** → **Medium** → **Low**

### Critical

| # | Issue | Location | Reasoning |
|---|-------|----------|-----------|
| C1 | **Polling captures stale closures** | `app/page.tsx` L194–201 | `useEffect` deps are `[]`. `loadWallet` / `loadPool` close over the first-render `address` and `pid`. After connect or pool switch, the 5s poll still uses stale values — balances and rewards stop updating correctly. |
| C2 | **No interval cleanup** | `app/page.tsx` L194–201 | `setInterval` never cleared on unmount → leak and duplicate intervals under HMR. |
| C3 | **No transaction confirmation or failure handling** | `app/page.tsx` L235–287 | Handlers lack `try/catch`. Success UI appears when a hash is returned, not when the tx is mined. User rejection and on-chain reverts produce unhandled rejections with no user feedback. |
| C4 | **Reads ignore wallet chain** | `app/page.tsx` L33–43 | `publicClientFor()` always uses TADA RPC. If the wallet is on another network, UI can show TADA on-chain data while the footer shows a different `chainId`. |

### High

| # | Issue | Location | Reasoning |
|---|-------|----------|-----------|
| H1 | **APR ignores pool allocation weight** | `app/page.tsx` L203–210 | Uses global `mvlPerBlock` only. MasterChef distributes `mvlPerBlock * allocPoint / totalAllocPoint` per pool. Multi-pool APR is wrong when weights differ. |
| H2 | **Pool 1 APR value assumption is wrong** | `lib/networks.ts` L37–39 | `APR_DEPOSIT_TOKEN_VALUE = 1` treats B_MVL deposits as 1:1 with A_MVL rewards. Assignment specifies B_MVL = 2 value units, A_MVL = 1 — pool 1 APR is economically incorrect. |
| H3 | **`parseAmount` precision loss** | `lib/format.ts` L26–33 | Uses `parseFloat` + `Math.floor(value * 1e18)`. Float rounding and unsafe integer range for large wei values. MAX button uses exact `formatUnits`; manual input can parse to a different amount. |
| H4 | **APR math uses `Number(bigint)` on wei** | `app/page.tsx` L206–209 | `Number(mvlPerBlock)` / `Number(totalStaked)` lose precision above `2^53 - 1`. |
| H5 | **Async read race conditions** | `app/page.tsx` L102–181 | Parallel `loadPool()` calls (effect + poll + post-tx) can finish out of order; slow response for old `pid` overwrites fresh data. |
| H6 | **Approve → deposit without receipt wait** | `app/page.tsx` L239–246 | Deposit can be sent before approve is mined → revert or confusing failure. |

### Medium

| # | Issue | Location | Reasoning |
|---|-------|----------|-----------|
| M1 | **No loading / in-flight state on writes** | `app/page.tsx` L391–475 | Only connect uses `isPending`. Stake/withdraw/harvest stay enabled during submission → double-submit risk. Harvest has no disabled guard. |
| M2 | **Inconsistent APR window display** | `app/page.tsx` L384–388 | Pool 0 shows APR only when reward window is active; pool 1 always shows APR even outside `[startBlock, endBlock)`. |
| M3 | **Staked amount shown as raw wei** | `app/page.tsx` L403 | `staked.toString()` while other fields use `formatAmount()` — users can misread by 1e18. |
| M4 | **Read errors only logged** | `app/page.tsx` L96–98, L178–180 | RPC failures show no UI; stale or `undefined` values render as "—" with no error state. |
| M5 | **No loading state for reads** | `app/page.tsx` | Initial fetch and refetch are indistinguishable from empty balances. |
| M6 | **Stale state after disconnect** | `app/page.tsx` | User-specific state not reset on disconnect/account change. |
| M7 | **No chain-switch UX** | `app/page.tsx` L355–358 | Banner when wrong network; no `switchChain` prompt. Writes fail with poor feedback. |
| M8 | **`useEffect` missing `address` dep** | `app/page.tsx` L184–191 | Account switch on same chain may not refetch user data. |
| M9 | **Env vars documented but not wired** | `.env.example`, `lib/networks.ts` | Chain ID, block time, token addresses, pool ID env vars exist but runtime uses hardcoded constants. |
| M10 | **Infinite approve (`maxUint256`)** | `app/page.tsx` L244 | Acceptable for a testnet demo; not ideal for production security posture. |

### Low

| # | Issue | Location | Reasoning |
|---|-------|----------|-----------|
| L1 | **`TokenConfig.decimals` ignored** | `lib/networks.ts`, `lib/format.ts` | All helpers assume 18 decimals. Breaks when Sepolia USDC (6 decimals) is added. |
| L2 | **Config duplicated in 3 places** | `networks.ts`, `contracts.ts`, `setup-wallet.ts` | Drift risk; `contracts.ts` address exports unused by UI. |
| L3 | **`viem` in devDependencies** | `package.json` | Imported in production `page.tsx`; should be a runtime dependency. |
| L4 | **Poll runs when disconnected** | `app/page.tsx` L194–201 | Unnecessary RPC load; no visibility pause. |
| L5 | **Hardcoded pool tabs (0 and 1)** | `app/page.tsx` L365–373 | Does not read `poolLength()` from contract. |
| L6 | **MetaMask-only connector** | `app/providers.tsx` L32 | `injected({ target: "metaMask" })` excludes other injected wallets. |
| L7 | **README claims "both chains"** | `README.md` L48 | Only TADA is configured. |

### Multicall note

No Multicall3 / `multicall` / `readContracts` usage found. Sequential reads are correct for MVL Testnet (no Multicall3 deployed). Trade-off: more RPC round-trips.

---

## 4. Architecture and extensibility concerns

1. **Monolithic page component** — `app/page.tsx` mixes layout, network config, data fetching, business logic (APR), form validation, and transaction orchestration. Hard to test, review, or extend.

2. **No chain abstraction** — Network name, RPC, tokens, and MasterChef are scattered constants. Adding Sepolia or MVL requires editing multiple files and the main page.

3. **Dual client mismatch** — Wagmi manages the wallet chain; reads use a separate hardcoded public client. This is the root cause of C4 and blocks multi-chain support.

4. **React Query unused** — Provider is configured (`staleTime: 2000`) but all reads use manual `useState` + polling. Misses built-in refetch keys, loading/error states, and cache invalidation after txs.

5. **No shared transaction layer** — Each handler duplicates write + feedback logic. No shared pending/confirmed/error lifecycle.

6. **APR config not per-pool** — Single global value constant cannot express per-token economics across pools.

**Recommended boundaries (planned refactor):**

- `lib/config/chains.ts` — per-chain RPC, tokens, staking addresses, APR assumptions
- `hooks/` — `useWalletBalances`, `useStakingPool`, `useContractTx`
- `components/` — `WalletTab`, `StakingTab`, `Header`, `TxBanner`
- `app/page.tsx` — thin tab shell

---

## 5. Planned fixes (by todo)

| Todo | Fixes |
|------|-------|
| `audit-report` | This document |
| `chain-config` | Unified chain definitions (TADA, MVL, Sepolia); ABIs only in `contracts.ts` |
| `providers-multi-chain` | Register all chains in wagmi; move `viem` to dependencies |
| `hooks-reads` | C1, C2, C4, H5, M4, M5, M6, M8, L4 — chain-scoped reads, polling cleanup, race guards |
| `hooks-tx` | C3, H6, M1, M7 — receipt wait, try/catch, approve sequencing, button states |
| `format-precision` | H3, L1 — `parseUnits`, per-token decimals |
| `apr-fix` | H1, H2, H4, M2 — allocPoint weighting, per-pool value units, window gating |
| `ui-components` | Component split, network switcher, M3 display fixes |
| `scripts-docs` | L2, L6, L7 — shared config in setup script, README, env docs |
| `verify-build` | Build + smoke tests |

---

## 6. Intentionally left out (and why)

| Item | Reason |
|------|--------|
| **Send / receive flows** | Out of assignment scope (wallet tab is read-only). |
| **Staking on Sepolia** | No staking contract on Sepolia per assignment; wallet-only support planned. |
| **Generic injected wallet** | MetaMask-only is acceptable for a focused demo; broadening to `injected()` is low priority unless requested. |
| **Exact-amount approve** | Infinite approve is common on testnet staking UIs; exact approve adds UX friction. Documented as M10. |
| **Multicall batching** | MVL Testnet has no Multicall3; sequential reads are required. |
| **On-chain `poolLength()` for pool UI** | Config-driven pool list is sufficient for two known pools; dynamic discovery is optional polish. |
| **Server-side / API routes** | dApp is fully client-side; no backend needed. |
| **Design mock / visual redesign** | Assignment allows judgment on UX; focus is stability and structure, not new visual design. |

---

## 7. External dependency risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| TADA RPC / explorer | Public endpoint may be slow or unavailable | Env override via `NEXT_PUBLIC_TADA_RPC_URL` |
| MVL Testnet RPC | Same | Env override in chain config |
| Sepolia public RPC | Rate limits on publicnode | Env override; document in README |
| TADA faucet (setup script) | AWS Lambda URL may change | Document failure in README; manual funding fallback |
| MVL Testnet faucet | Not in starter script | Update setup script or document manual funding |

If RPC or contracts become unavailable during review, reasonable mocking (static fixtures) is acceptable with trade-offs documented here.

---

## 8. Target network matrix (post-implementation)

| Network | Chain ID | Wallet | Staking |
|---------|----------|--------|---------|
| TADA Protocol Testnet | 31451 | Yes | Yes |
| MVL Testnet | 8453200012 | Yes | Yes |
| Ethereum Sepolia | 11155111 | Yes | No |

---

*This report reflects the codebase baseline before hardening. Sections 5 and 8 will be updated as fixes land.*
