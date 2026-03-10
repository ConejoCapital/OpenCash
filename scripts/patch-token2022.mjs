#!/usr/bin/env node
/**
 * Postinstall patch: adds Token-2022 programId support to
 * @faremeter/payment-solana client-side exact handler.
 *
 * Without this patch, createTransferCheckedInstruction defaults to
 * SPL Token v1 even when token.programId is set to Token-2022.
 */
import fs from "fs";
import path from "path";

const target = path.resolve(
    "node_modules/@faremeter/payment-solana/dist/src/exact/client.js"
);

if (!fs.existsSync(target)) {
    console.log("[patch] @faremeter/payment-solana not found — skipping");
    process.exit(0);
}

let src = fs.readFileSync(target, "utf8");

// Already patched?
if (src.includes("tokenProgramId")) {
    console.log("[patch] @faremeter/payment-solana already patched");
    process.exit(0);
}

// 1. Extract tokenProgramId from options
src = src.replace(
    "const getAssociatedTokenAddressSyncRest = generateGetAssociatedTokenAddressSyncRest(options?.token ?? {});",
    "const getAssociatedTokenAddressSyncRest = generateGetAssociatedTokenAddressSyncRest(options?.token ?? {});\n    const tokenProgramId = options?.token?.programId;"
);

// 2. ToSpec: pass programId to createTransferCheckedInstruction
src = src.replace(
    "instructions.push(createTransferCheckedInstruction(sourceAccount, mint, receiverAccount, wallet.publicKey, amount, decimals));",
    "instructions.push(createTransferCheckedInstruction(sourceAccount, mint, receiverAccount, wallet.publicKey, amount, decimals, [], tokenProgramId));"
);

// 3. SettlementAccount: pass programId to both ATA creation and transfer
src = src.replace(
    "instructions.push(createAssociatedTokenAccountIdempotentInstruction(wallet.publicKey, settleATA, settleKeypair.publicKey, mint), createTransferCheckedInstruction(sourceAccount, mint, settleATA, wallet.publicKey, amount, decimals));",
    "instructions.push(createAssociatedTokenAccountIdempotentInstruction(wallet.publicKey, settleATA, settleKeypair.publicKey, mint, tokenProgramId), createTransferCheckedInstruction(sourceAccount, mint, settleATA, wallet.publicKey, amount, decimals, [], tokenProgramId));"
);

fs.writeFileSync(target, src);
console.log("[patch] @faremeter/payment-solana patched for Token-2022 ✓");
