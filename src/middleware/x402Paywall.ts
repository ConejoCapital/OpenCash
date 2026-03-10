/**
 * OpenCash — x402 paywall middleware factory.
 * Thin wrapper around @faremeter/middleware/express.
 */

import { createMiddleware } from "@faremeter/middleware/express";
import type { PaymentOption } from "../types.js";

/**
 * Create an Express middleware that gates a route behind x402 payment.
 */
export async function createPaywall(
  facilitatorUrl: string,
  accepts: PaymentOption[],
) {
  return await createMiddleware({
    facilitatorURL: facilitatorUrl,
    accepts,
    supportedVersions: { x402v1: true, x402v2: true },
  });
}
