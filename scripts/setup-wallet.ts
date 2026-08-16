/**
 * Creates a disposable test wallet and funds it through the faucet.
 *
 * Run: npm run setup:wallet
 * Import the printed private key into MetaMask through "Import account".
 * Warning: this is a disposable testnet-only key. Do not reuse it anywhere else.
 *
 * This setup helper uses viem. Your app may use any Web3 library you prefer.
 */
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import {
  createPublicClient,
  http,
  defineChain,
  formatEther,
  formatUnits,
  type Address,
} from "viem";

// TADA Protocol Testnet (L1).
const CHAIN_ID = 31451;
const RPC_URL = "https://full.tada-protocol-testnet.xyz/jsonrpc";
const NATIVE_SYMBOL = "TADA";
const A_MVL_ADDRESS: Address =
  "0xa9728bf6a4cb2646e4E6E6B074CCc5305DBC904f"; // pool0 deposit and reward token, symbol A_MVL
const B_MVL_ADDRESS: Address =
  "0x8999b932877c854df9Ce4EEC737cb0CdFEC48A18"; // pool1 deposit token, symbol B_MVL
const FAUCET_URL =
  "https://vtghk6j2xleu2a2ohfkmp6mhra0nipse.lambda-url.ap-northeast-2.on.aws/";

const chain = defineChain({
  id: CHAIN_ID,
  name: "TADA Protocol Testnet",
  nativeCurrency: { decimals: 18, name: NATIVE_SYMBOL, symbol: NATIVE_SYMBOL },
  rpcUrls: { default: { http: [RPC_URL] } },
});

const erc20Abi = [
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

const publicClient = createPublicClient({ chain, transport: http() });

async function main() {
  console.log("\n🔑 Generating wallet...\n");

  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);

  console.log(`  Address:     ${account.address}`);
  console.log(`  Private Key: ${privateKey}`);

  console.log("\n💧 Requesting faucet...\n");

  const res = await fetch(FAUCET_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: account.address }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error(`  ❌ Faucet failed: ${data.error ?? res.statusText}`);
    process.exit(1);
  }

  console.log("  ✅ Faucet success!");
  if (data.txHashes) {
    for (const [key, value] of Object.entries(data.txHashes)) {
      console.log(`  ${key}: ${value as string}`);
    }
  }

  console.log("\n💰 Balances:\n");

  const [native, aMvl, bMvl] = await Promise.all([
    publicClient.getBalance({ address: account.address }),
    publicClient.readContract({
      address: A_MVL_ADDRESS,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [account.address],
    }),
    publicClient.readContract({
      address: B_MVL_ADDRESS,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [account.address],
    }),
  ]);

  console.log(`  ${NATIVE_SYMBOL}: ${formatEther(native)}`);
  console.log(`  A_MVL: ${formatUnits(aMvl, 18)}`);
  console.log(`  B_MVL: ${formatUnits(bMvl, 18)}`);

  console.log(
    '\n📥 Import the private key below into MetaMask using "Import account":\n',
  );
  console.log(`  ${privateKey}\n`);
  console.log(
    "  ⚠️  This is a disposable testnet-only key. Do not reuse it anywhere else.\n",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
