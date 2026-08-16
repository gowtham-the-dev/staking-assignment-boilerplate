import { useEffect } from "react";

const POLL_MS = 5000;

export function usePollCallback(
  callback: () => void,
  enabled: boolean,
  intervalMs = POLL_MS,
): void {
  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      if (document.hidden) return;
      callback();
    };

    const id = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(id);
  }, [callback, enabled, intervalMs]);
}
