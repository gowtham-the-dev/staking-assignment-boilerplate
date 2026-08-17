# Staking dApp — Audit & Implementation Report

**Date:** August 2026  
**Repository:** https://github.com/gowtham-the-dev/staking-assignment-boilerplate
**Deployed Url for Testing:** https://tada-test-task-gowtham.netlify.app/

## 1. What the app does

This is a Next.js/React staking dApp that connects to MetaMask and provides:

- **Wallet:** native and configured ERC-20 balance views.
- **Staking:** deposit, harvest, withdraw, and withdraw+harvest through a `MasterChefSingleEvent` contract.
- **Multi-network support:** TADA Protocol Testnet, MVL Testnet, and Ethereum Sepolia.
- **UI:** the interface was also refactored into separate wallet/staking/network/transaction components with loading, error, transaction-status, and network-switch feedback.

The original implementation was largely contained in `app/page.tsx`, with network configuration, reads, writes, APR calculations, and UI state mixed together. The inherited audit identified stale polling, missing transaction confirmation, chain-mismatched reads, precision issues, incorrect APR calculations, and several maintainability concerns. fileciteturn0file0L30-L54

## 2. Key issues found

| Severity | Issue | Reasoning |
|---|---|---|
| Critical | Stale polling and missing cleanup | Polling could use stale account/pool values and intervals were not cleaned up. |
| Critical | No transaction confirmation/error lifecycle | The UI treated a returned transaction hash as success and did not reliably handle rejection/revert cases. |
| Critical | Reads ignored the connected chain | Reads were hardwired to TADA, so wallet state and displayed on-chain data could disagree. |
| High | Incorrect APR calculation | APR did not account for `allocPoint / totalAllocPoint` or per-pool token value assumptions. |
| High | Amount/BigInt precision issues | Floating-point parsing and `Number(bigint)` could lose token precision. |
| High | Approve/deposit race | Deposit could be submitted before the approval transaction was mined. |
| Medium | Weak loading/error/pending UX | Reads and writes lacked clear in-progress/error states, increasing confusion and double-submit risk. |
| Medium | Stale state on disconnect/account changes | User-specific data was not consistently cleared/refetched. |
| Low | Configuration duplication and hardcoded pools | Network/token/contract configuration was scattered and pool tabs were hardcoded. |

The original architecture also mixed layout, data fetching, business logic, validation, and transaction orchestration in one page, making the application harder to test and extend. fileciteturn0file0L115-L127

## 3. What was implemented

The application was refactored around a chain-config-driven architecture:

```text
app/
  page.tsx
  providers.tsx

components/
  Header.tsx
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
  config/chains.ts
  config/index.ts
  contracts.ts
  apr.ts
  errors.ts
  format.ts
  publicClient.ts
```

### Main fixes

- Added TADA, MVL Testnet, and Sepolia chain configuration.
- Made reads chain-aware using the active network configuration.
- Added polling cleanup, connection/visibility guards, and async request guards.
- Added transaction lifecycle handling: signing → confirming → success/error.
- Waited for approval confirmation before submitting a stake.
- Added pre-flight `simulateContract` checks and write-chain guards.
- Replaced floating-point amount parsing with viem `parseUnits`.
- Added per-token decimals, including support for 6-decimal tokens.
- Corrected APR using pool allocation weights and per-pool value units.
- Added loading/error states and transaction banners.
- Added network switching UX.
- Cleared stale user state on disconnect/account changes.
- Centralized configuration and made pool UI config-driven.
- Replaced unlimited approval with exact-amount approval.
- Added security headers and sanitized user-facing errors.
- Updated README, environment configuration, and wallet setup tooling.
- Updated the UI while keeping the assignment scope focused.

## 4. Network scope and testing

| Network | Wallet | Staking |
|---|---:|---:|
| TADA Protocol Testnet (`31451`) | Yes | Yes |
| MVL Testnet (`8453200012`) | Yes | Yes* |
| Ethereum Sepolia (`11155111`) | Yes | No |

\* **MVL staking was implemented but could not be fully smoke-tested because a usable MVL faucet was not available for obtaining test funds.** Sepolia staking is intentionally unsupported because there is no staking contract for that network in the assignment scope.

Automated verification passed:

```bash
npm run build
npm run lint
```

Manual transaction testing requires MetaMask and funded testnet accounts. If external RPC/contract infrastructure is unavailable during review, the application can reasonably be demonstrated with mocked/static data, with the trade-off that mocked runs cannot validate real wallet signing, transaction mining, or contract behavior.

## 5. Intentionally left out

- **Send/receive flows** — outside the read-only wallet scope.
- **Sepolia staking** — no staking contract in the assignment scope.
- **Generic injected wallets** — MetaMask-only retained for this focused demo.
- **Multicall3 batching** — MVL Testnet does not provide the required Multicall3 deployment; sequential reads are therefore retained.
- **Dynamic `poolLength()` discovery** — known pools are configuration-driven; dynamic discovery was not necessary for the assignment.
- **Backend/API routes** — the dApp does not require a backend.
- **Major visual redesign** — the UI was improved and componentized, but effort was prioritized toward correctness, transaction safety, and extensibility.

## 6. Architecture / trade-offs

The main architectural improvement is separating **network configuration, reads, transaction handling, APR logic, and UI components**. Adding another supported chain now primarily requires configuration rather than modifying a monolithic page.

React Query remains as a provider, while reads use custom hooks. This was a deliberate trade-off to retain explicit control over chain-scoped reads and polling behavior rather than introducing a larger migration to `useReadContract`.

The app still depends on configured RPC endpoints and trusted staking contract addresses. RPC URLs can be overridden through environment variables, and contract addresses should be verified before deployment.

## 7. Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Then open the local Next.js URL and connect MetaMask.

For production/build verification:

```bash
npm run lint
npm run build
```

