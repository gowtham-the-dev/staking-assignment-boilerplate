// Amount formatting helpers with per-token decimal support.

import { formatUnits, parseUnits } from "viem";

const DEFAULT_DECIMALS = 18;

/** Format a raw token amount into a human string with `displayDecimals` places. */
export function formatAmount(
  raw: bigint | undefined,
  decimals = DEFAULT_DECIMALS,
  displayDecimals = 4,
): string {
  if (raw === undefined) return "—";
  const full = formatUnits(raw, decimals);
  const [whole, frac = ""] = full.split(".");
  const wholeGrouped = Number(whole).toLocaleString("en-US");
  if (displayDecimals === 0) return wholeGrouped;
  const fracTrimmed = frac.slice(0, displayDecimals);
  return fracTrimmed.length > 0 ? `${wholeGrouped}.${fracTrimmed}` : wholeGrouped;
}

/** Turn a raw token balance into a plain Number for quick math/comparisons. */
export function toNumber(raw: bigint | undefined, decimals = DEFAULT_DECIMALS): number {
  if (raw === undefined) return 0;
  return Number(formatUnits(raw, decimals));
}

/** Parse a user-typed decimal string into raw token units. undefined if invalid. */
export function parseAmount(input: string, decimals = DEFAULT_DECIMALS): bigint | undefined {
  const trimmed = input.trim();
  if (trimmed === "") return undefined;
  if (!/^\d*\.?\d*$/.test(trimmed)) return undefined;
  if (trimmed === ".") return undefined;

  const fractional = trimmed.split(".")[1];
  if (fractional && fractional.length > decimals) return undefined;

  try {
    return parseUnits(trimmed, decimals);
  } catch {
    return undefined;
  }
}

/** Full-precision decimal string for MAX (no grouping). */
export function toFullPrecision(raw: bigint, decimals = DEFAULT_DECIMALS): string {
  const full = formatUnits(raw, decimals);
  return full.replace(/\.?0+$/, "") || "0";
}

/** Shorten an account: 0x1a2b…9f3c */
export function shortAddress(account?: string): string {
  if (!account) return "";
  return `${account.slice(0, 4)}…${account.slice(-2)}`;
}
