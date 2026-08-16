/** User-safe error messages — never expose raw RPC / stack details in the UI. */

const SAFE_MESSAGES = new Set([
  "Unsupported network",
  "Staking is not supported on this network",
  "Wallet not connected",
  "Transaction reverted on-chain",
  "Transaction would fail on-chain",
]);

export function toUserFacingError(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  const code = (error as { code?: number })?.code;
  if (code === 4001) return "Transaction rejected in wallet";

  if (error instanceof Error) {
    if (SAFE_MESSAGES.has(error.message)) return error.message;

    const msg = error.message.toLowerCase();
    if (msg.includes("user rejected") || msg.includes("user denied")) {
      return "Transaction rejected in wallet";
    }
    if (msg.includes("insufficient funds")) {
      return "Insufficient funds for gas";
    }
    if (
      msg.includes("reverted") ||
      msg.includes("revert") ||
      msg.includes("simulation") ||
      msg.includes("execution reverted")
    ) {
      return "Transaction would fail on-chain";
    }
  }

  return fallback;
}

export const TX_ERROR_FALLBACK = "Transaction failed. Please try again.";
export const READ_ERROR_FALLBACK = "Failed to load on-chain data. Please try again.";
