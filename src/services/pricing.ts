/**
 * OpenCash — Generic pricing utilities.
 * Converts dollar prices to on-chain base units and generates x402 payment options.
 */

import type { TokenConfig, Network, PaymentOption } from "../types.js";

/**
 * Convert a price string (e.g. "0.005" or "$0.005") to base units for a token.
 */
export function priceToBaseUnits(
  price: string,
  decimals: number,
): string {
  const numeric = parseFloat(price.replace("$", ""));
  const baseUnits = Math.round(numeric * 10 ** decimals);
  return String(baseUnits);
}

/**
 * Generate x402-compatible payment options for a service.
 * One entry per accepted token.
 */
export function getAcceptedPaymentOptions(
  price: string,
  tokens: TokenConfig[],
  network: Network,
  payTo: string,
  description: string,
): PaymentOption[] {
  return tokens.map((token) => {
    const amount = priceToBaseUnits(price, token.decimals);
    return {
      scheme: "exact" as const,
      amount,
      maxAmountRequired: amount,
      asset: token.mint,
      network,
      payTo,
      description,
      maxTimeoutSeconds: 600,
    };
  });
}
