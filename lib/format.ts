// Formatting helpers for token amounts. Everything on-chain is 18-decimals so
// we just divide by 1e18 for display.

import { formatUnits } from "viem";

const DECIMALS = 18;

/** Format a raw wei bigint into a human string with `displayDecimals` places. */
export function formatAmount(raw: bigint | undefined, displayDecimals = 4): string {
  if (raw === undefined) return "—";
  const full = formatUnits(raw, DECIMALS);
  const [whole, frac = ""] = full.split(".");
  const wholeGrouped = Number(whole).toLocaleString("en-US");
  if (displayDecimals === 0) return wholeGrouped;
  const fracTrimmed = frac.slice(0, displayDecimals);
  return fracTrimmed.length > 0 ? `${wholeGrouped}.${fracTrimmed}` : wholeGrouped;
}

/** Turn a raw wei balance into a plain Number for quick math/comparisons. */
export function toNumber(raw: bigint | undefined): number {
  if (raw === undefined) return 0;
  return Number(raw) / 1e18;
}

/** Parse a user-typed decimal string into raw wei. undefined if invalid. */
export function parseAmount(input: string): bigint | undefined {
  const trimmed = input.trim();
  if (trimmed === "") return undefined;
  if (!/^\d*\.?\d*$/.test(trimmed)) return undefined;
  const value = parseFloat(trimmed);
  if (!Number.isFinite(value)) return undefined;
  // scale the decimal amount up to 18-decimal wei
  return BigInt(Math.floor(value * 10 ** DECIMALS));
}

/** Full-precision decimal string for MAX (no grouping). */
export function toFullPrecision(raw: bigint): string {
  const full = formatUnits(raw, DECIMALS);
  return full.replace(/\.?0+$/, "") || "0";
}

/** Shorten an account: 0x1a2b…9f3c */
export function shortAddress(account?: string): string {
  if (!account) return "";
  return `${account.slice(0, 6)}…${account.slice(-4)}`;
}
