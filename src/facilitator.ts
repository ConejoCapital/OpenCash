/**
 * OpenCash — Built-in facilitator node.
 * Handles USDC (SPL Token) and PYUSD (Token-2022) payment verification + settlement.
 * Ported from x402OpenGemiClaw/src/facilitatorNode.ts, generalized for any config.
 */

import { serve } from "@hono/node-server";
import { createFacilitatorRoutes } from "@faremeter/facilitator";
import { createFacilitatorHandler } from "@faremeter/payment-solana/exact";
import {
  Keypair,
  PublicKey,
  Connection,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  decodeTransferCheckedInstruction,
} from "@solana/spl-token";
import { createSolanaRpc } from "@solana/kit";
import { base58 } from "@scure/base";
import type { FacilitatorHandler } from "@faremeter/types/facilitator";
import type {
  x402PaymentRequirements,
  x402PaymentPayload,
  x402SettleResponse,
  x402VerifyResponse,
} from "@faremeter/types/x402v2";
import type { OpenCashConfig, Network, TokenConfig } from "./types.js";

/**
 * Creates a Token-2022 aware facilitator handler.
 * The default @faremeter handler only supports SPL Token (v1),
 * so this custom handler decodes Token-2022 TransferChecked instructions correctly.
 */
async function createToken2022FacilitatorHandler(
  feePayerKeypair: Keypair,
  mint: PublicKey,
  connection: Connection,
  networkCaip2: string,
): Promise<FacilitatorHandler> {
  const feePayerAddress = feePayerKeypair.publicKey.toBase58();
  const mintAddress = mint.toBase58();

  const isMatchingRequirement = (req: x402PaymentRequirements) =>
    req.scheme === "exact" &&
    req.network === networkCaip2 &&
    req.asset === mintAddress;

  const getSupported = () => [
    Promise.resolve({
      x402Version: 2 as const,
      scheme: "exact",
      network: networkCaip2,
      extra: {
        feePayer: feePayerAddress,
        features: {},
      },
    }),
  ];

  const getRequirements = async ({
    accepts,
  }: {
    accepts: x402PaymentRequirements[];
    resource?: { url: string };
  }) => {
    const { blockhash: recentBlockhash } =
      await connection.getLatestBlockhash();

    return accepts.filter(isMatchingRequirement).map((req) => ({
      ...req,
      asset: mintAddress,
      extra: {
        feePayer: feePayerAddress,
        decimals: 6,
        recentBlockhash,
        features: {},
      },
    }));
  };

  const validateAndExtractPayer = async (
    requirements: x402PaymentRequirements,
    payment: x402PaymentPayload,
  ): Promise<string | null> => {
    const { transaction: txBase64 } = payment.payload as {
      transaction: string;
    };
    if (!txBase64) return null;

    let tx: VersionedTransaction;
    try {
      const txBytes = Buffer.from(txBase64, "base64");
      tx = VersionedTransaction.deserialize(txBytes);
    } catch {
      return null;
    }

    const txMessage = tx.message;
    const accountKeys = txMessage.staticAccountKeys;
    const feePayerInTx = accountKeys[0]?.toBase58();
    if (feePayerInTx !== feePayerAddress) return null;

    const instructions = txMessage.compiledInstructions;
    if (instructions.length < 3 || instructions.length > 5) return null;

    const transferIx = instructions[2];
    if (!transferIx) return null;

    const programKey = accountKeys[transferIx.programIdIndex];
    if (!programKey) return null;

    let decoded: ReturnType<typeof decodeTransferCheckedInstruction> | null = null;
    const ixAccounts = transferIx.accountKeyIndexes.map((idx) => accountKeys[idx]!);
    const legacyIx = {
      programId: programKey,
      keys: ixAccounts.map((pk, i) => ({
        pubkey: pk,
        isSigner: i === 3,
        isWritable: i === 0 || i === 2,
      })),
      data: Buffer.from(transferIx.data),
    };
    try {
      decoded = decodeTransferCheckedInstruction(legacyIx as any, TOKEN_2022_PROGRAM_ID);
    } catch {
      try {
        decoded = decodeTransferCheckedInstruction(legacyIx as any);
      } catch {
        return null;
      }
    }

    if (!decoded) return null;
    if (Number(decoded.data.amount) !== Number(requirements.amount)) return null;
    if (decoded.keys.mint.pubkey.toBase58() !== mintAddress) return null;

    const expectedDestination = getAssociatedTokenAddressSync(
      mint,
      new PublicKey(requirements.payTo),
      false,
      TOKEN_2022_PROGRAM_ID,
    );
    if (decoded.keys.destination.pubkey.toBase58() !== expectedDestination.toBase58()) return null;

    const authority = decoded.keys.owner.pubkey.toBase58();
    if (authority === feePayerAddress) return null;

    return authority;
  };

  const handleVerify = async (
    requirements: x402PaymentRequirements,
    payment: x402PaymentPayload,
  ): Promise<x402VerifyResponse | null> => {
    if (!isMatchingRequirement(requirements)) return null;
    const payer = await validateAndExtractPayer(requirements, payment);
    if (!payer) return { isValid: false, invalidReason: "Invalid transaction" };
    return { isValid: true, payer };
  };

  const handleSettle = async (
    requirements: x402PaymentRequirements,
    payment: x402PaymentPayload,
  ): Promise<x402SettleResponse | null> => {
    if (!isMatchingRequirement(requirements)) return null;

    const payer = await validateAndExtractPayer(requirements, payment);
    if (!payer) {
      return {
        success: false,
        errorReason: "Invalid transaction",
        transaction: "",
        network: requirements.network,
      };
    }

    const { transaction: txBase64 } = payment.payload as { transaction: string };
    const txBytes = Buffer.from(txBase64, "base64");
    const tx = VersionedTransaction.deserialize(txBytes);
    tx.sign([feePayerKeypair]);

    try {
      const sig = await connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      });

      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        signature: sig,
        ...latestBlockhash,
      });

      return {
        success: true,
        transaction: sig,
        network: requirements.network,
        payer,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Transaction failed";
      return {
        success: false,
        errorReason: msg,
        transaction: "",
        network: requirements.network,
      };
    }
  };

  return { getSupported, getRequirements, handleVerify, handleSettle };
}

/**
 * Bootstrap the built-in facilitator node.
 * Creates handlers for all configured tokens — SPL Token via @faremeter,
 * Token-2022 via custom handler.
 */
export async function bootstrapFacilitator(
  config: OpenCashConfig,
  network: Network,
  port: number,
): Promise<number> {
  const rpcUrl =
    process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
  const rpc = createSolanaRpc(rpcUrl);
  const connection = new Connection(rpcUrl, "confirmed");

  if (!process.env.SVM_PRIVATE_KEY) {
    throw new Error(
      "SVM_PRIVATE_KEY is required to run the built-in facilitator. " +
      "Set it to a base58-encoded Solana private key with SOL for fees.",
    );
  }

  const feePayerKeypair = Keypair.fromSecretKey(
    base58.decode(process.env.SVM_PRIVATE_KEY),
  );

  console.log("Bootstrapping facilitator handlers...");
  console.log(`  Fee payer: ${feePayerKeypair.publicKey.toBase58()}`);

  const handlers: FacilitatorHandler[] = [];

  for (const token of config.tokens) {
    if (token.program === "token-2022") {
      // Custom Token-2022 handler
      const handler = await createToken2022FacilitatorHandler(
        feePayerKeypair,
        new PublicKey(token.mint),
        connection,
        network,
      );
      handlers.push(handler);
      console.log(`  ${token.symbol}: Token-2022 handler (custom)`);
    } else {
      // Standard SPL Token handler via @faremeter
      const handler = await createFacilitatorHandler(
        network,
        rpc as any,
        feePayerKeypair,
        new PublicKey(token.mint),
      );
      handlers.push(handler);
      console.log(`  ${token.symbol}: SPL Token handler (@faremeter)`);
    }
  }

  const app = createFacilitatorRoutes({ handlers });
  const facilitatorPort = port;

  serve({ fetch: app.fetch, port: facilitatorPort }, (info) => {
    console.log(`Facilitator running on http://localhost:${info.port}`);
  });

  return facilitatorPort;
}
