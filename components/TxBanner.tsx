import type { TxPhase } from "@/hooks/useContractTx";

type TxBannerProps = {
  phase: TxPhase;
  message: string | null;
  hash: string | null;
  explorerUrl: string;
  onDismiss: () => void;
};

export function TxBanner({ phase, message, hash, explorerUrl, onDismiss }: TxBannerProps) {
  if (!message) return null;

  const className =
    phase === "error" ? "tx tx-err" : phase === "success" ? "tx tx-ok" : "tx tx-info";

  return (
    <div className={className}>
      <span className="tx-msg">{message}</span>
      {hash && explorerUrl && (
        <a
          className="tx-link"
          href={`${explorerUrl}/tx/${hash}`}
          target="_blank"
          rel="noreferrer"
        >
          View
        </a>
      )}
      <button className="tx-x" type="button" onClick={onDismiss}>
        ✕
      </button>
    </div>
  );
}
