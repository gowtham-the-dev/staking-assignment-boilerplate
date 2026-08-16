import { Circle, Layers, Wallet } from "lucide-react";

type TokenIconProps = {
  symbol: string;
  size?: number;
};

const TOKEN_STYLE: Record<string, { Icon: typeof Layers; color: string }> = {
  A_MVL: { Icon: Layers, color: "#7c8cff" },
  B_MVL: { Icon: Circle, color: "#57c08a" },
  MVL: { Icon: Circle, color: "#57c08a" },
  USDC: { Icon: Wallet, color: "#4da6ff" },
  TADA: { Icon: Wallet, color: "#ffa500" },
};

export function TokenIcon({ symbol, size = 18 }: TokenIconProps) {
  const style = TOKEN_STYLE[symbol] ?? { Icon: Wallet, color: "#9a9ca2" };
  const { Icon, color } = style;

  return (
    <span className="token-icon" style={{ backgroundColor: `${color}22`, color }}>
      <Icon size={size} strokeWidth={2} />
    </span>
  );
}

export function tokenDisplayName(symbol: string): string {
  switch (symbol) {
    case "A_MVL":
      return "MVL Token A";
    case "B_MVL":
      return "MVL Token B";
    case "TADA":
      return "TADA Governance";
    case "MVL":
      return "MVL Token";
    case "USDC":
      return "USD Coin";
    default:
      return symbol;
  }
}
