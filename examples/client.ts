/**
 * OpenCash — Example x402 Agent Client
 *
 * Demonstrates:
 *   1. Discovers available services (free)
 *   2. Makes a paid request through the x402 proxy
 *   3. x402 client handles 402 challenge → builds Solana payment → retries
 *
 * Prerequisites:
 *   1. A running OpenCash server (npm run dev)
 *   2. A Solana wallet (base58 private key) with SOL + USDC or PYUSD
 *
 * WARNING: Uses REAL stablecoins on Solana mainnet by default.
 *
 * Usage:
 *   SVM_PRIVATE_KEY=<your-key> npx tsx examples/client.ts
 */

import "dotenv/config";
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { createKeyPairSignerFromBytes } from "@solana/kit";
import { base58 } from "@scure/base";

const SERVER_URL = process.env.SERVER_URL || "http://localhost:4020";
const SVM_PRIVATE_KEY = process.env.SVM_PRIVATE_KEY;

async function main() {
  if (!SVM_PRIVATE_KEY) {
    console.error("Set SVM_PRIVATE_KEY to your base58-encoded Solana private key");
    process.exit(1);
  }

  // Setup x402 client
  console.log("Setting up x402 client...");
  const keyBytes = base58.decode(SVM_PRIVATE_KEY);
  const svmSigner = await createKeyPairSignerFromBytes(keyBytes);
  console.log(`  Wallet: ${svmSigner.address}`);

  const client = new x402Client();
  // Register Solana handler — uses default ExactSvmScheme
  // If using Corbits facilitator, you may need NoMemoExactSvmScheme
  // See: https://github.com/coinbase/x402/issues/1203
  const { ExactSvmScheme } = await import("@x402/svm/exact/client");
  client.register("solana:*", new ExactSvmScheme(svmSigner));

  const fetchWithPayment = wrapFetchWithPayment(fetch, client);

  // Step 1: Discover available services (free)
  console.log("\n--- Service Discovery ---");
  const discoverRes = await fetch(`${SERVER_URL}/v1/discover`);
  const discovery = await discoverRes.json();
  console.log(`Operator: ${discovery.operator}`);
  console.log(`Services: ${discovery.services.length}`);
  for (const svc of discovery.services) {
    console.log(`  ${svc.method} ${svc.endpoint} — ${svc.description} (${svc.price})`);
  }

  // Step 2: Pick the first service and make a paid request
  const target = discovery.services[0];
  if (!target) {
    console.log("No services available");
    return;
  }

  console.log(`\n--- Sending paid request to ${target.endpoint} ---`);
  console.log("  This will pay with USDC or PYUSD on Solana mainnet...\n");

  try {
    const response = await fetchWithPayment(`${SERVER_URL}${target.endpoint}`, {
      method: target.method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Hello from OpenCash agent!",
      }),
    });

    console.log(`Response status: ${response.status}`);
    const result = await response.json();
    console.log("Response:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

main().catch(console.error);
