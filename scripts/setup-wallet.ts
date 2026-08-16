/**
 * Creates a disposable test wallet and optionally funds it through a faucet.
 *
 * Run:
 *   npm run setup:wallet              # TADA Protocol Testnet (default)
 *   npm run setup:wallet -- --network mvl
 *
 * Import the printed private key into MetaMask through "Import account".
 * Warning: disposable testnet-only keys. Do not reuse them anywhere else.
 */
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http, defineChain, formatEther, formatUnits } from "viem";
import { mvlChain, tadaChain } from "../lib/config/chains";

const TADA_FAUCET_URL =
  process.env.TADA_FAUCET_URL ??
  "https://vtghk6j2xleu2a2ohfkmp6mhra0nipse.lambda-url.ap-northeast-2.on.aws/";

const erc20Abi = [
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

type SetupNetwork = "tada" | "mvl";

function parseNetwork(): SetupNetwork {
  const idx = process.argv.indexOf("--network");
  const value = idx >= 0 ? process.argv[idx + 1] : "tada";
  return value === "mvl" ? "mvl" : "tada";
}

function toViemChain(config: typeof tadaChain) {
  return defineChain({
    id: config.id,
    name: config.name,
    nativeCurrency: {
      decimals: config.nativeDecimals,
      name: config.nativeSymbol,
      symbol: config.nativeSymbol,
    },
    rpcUrls: { default: { http: [config.rpcUrl] } },
  });
}

async function requestTadaFaucet(address: string) {
  const res = await fetch(TADA_FAUCET_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });

  const data = (await res.json()) as { error?: string; txHashes?: Record<string, string> };

  if (!res.ok) {
    throw new Error(data.error ?? res.statusText);
  }

  return data;
}

async function main() {
  const network = parseNetwork();
  const config = network === "mvl" ? mvlChain : tadaChain;
  const client = createPublicClient({
    chain: toViemChain(config),
    transport: http(config.rpcUrl),
  });

  console.log(`\n🔑 Generating wallet for ${config.name}...\n`);

  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);

  console.log(`  Address:     ${account.address}`);
  console.log(`  Private Key: ${privateKey}`);

  if (network === "tada") {
    console.log("\n💧 Requesting TADA faucet...\n");
    try {
      const data = await requestTadaFaucet(account.address);
      console.log("  ✅ Faucet success!");
      if (data.txHashes) {
        for (const [key, value] of Object.entries(data.txHashes)) {
          console.log(`  ${key}: ${value}`);
        }
      }
    } catch (error) {
      console.error(`  ❌ Faucet failed: ${error instanceof Error ? error.message : error}`);
      console.log("  Continue with manual funding if the faucet is unavailable.\n");
    }
  } else {
    console.log(
      "\nℹ️  No automated faucet is configured for MVL Testnet.",
    );
    console.log("  Fund this address with LMVL and test tokens manually before using the app.\n");
  }

  console.log("💰 Balances:\n");

  const native = await client.getBalance({ address: account.address });
  console.log(`  ${config.nativeSymbol}: ${formatEther(native)}`);

  for (const token of config.tokens) {
    const balance = await client.readContract({
      address: token.address,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [account.address],
    });
    console.log(`  ${token.symbol}: ${formatUnits(balance, token.decimals)}`);
  }

  console.log(
    '\n📥 Import the private key below into MetaMask using "Import account":\n',
  );
  console.log(`  ${privateKey}\n`);
  console.log(
    "  ⚠️  This is a disposable testnet-only key. Do not reuse it anywhere else.\n",
  );
  console.log(`  Add ${config.name} (chain ${config.id}) to MetaMask if needed, then switch networks in the app header.\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
