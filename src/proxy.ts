/**
 * OpenCash — Core proxy engine.
 * Reads config, creates per-service Express routes with x402 paywall + upstream proxy.
 */

import express, { type Request, type Response, type Router } from "express";
import { createPaywall } from "./middleware/x402Paywall.js";
import { getAcceptedPaymentOptions } from "./services/pricing.js";
import type { OpenCashConfig, Network } from "./types.js";

/**
 * Create an Express router with one route per configured service.
 * Each route: POST /v1/proxy/{service.name} → x402 paywall → upstream proxy
 */
export async function createProxyRouter(
  config: OpenCashConfig,
  network: Network,
  facilitatorUrl: string,
): Promise<Router> {
  const router = express.Router();

  for (const service of config.services) {
    const method = (service.method || "POST").toLowerCase() as
      | "get" | "post" | "put" | "patch" | "delete";
    const routePath = `/v1/proxy/${service.name}`;

    // Build x402 payment options for this service
    const accepts = getAcceptedPaymentOptions(
      service.price,
      config.tokens,
      network,
      config.operator.payment_address,
      `Payment for ${service.description}`,
    );

    // Create paywall middleware
    const paywall = await createPaywall(facilitatorUrl, accepts);

    // Upstream proxy handler
    const handler = async (req: Request, res: Response) => {
      try {
        // Build upstream request headers
        const upstreamHeaders: Record<string, string> = {
          "Content-Type": "application/json",
        };

        // Inject operator's auth credentials
        if (service.auth) {
          upstreamHeaders[service.auth.header] = service.auth.value;
        }

        // Inject any additional static headers
        if (service.headers) {
          for (const [key, value] of Object.entries(service.headers)) {
            upstreamHeaders[key] = value;
          }
        }

        // Forward request to upstream
        const upstreamRes = await fetch(service.upstream, {
          method: service.method || "POST",
          headers: upstreamHeaders,
          ...(method !== "get" && method !== "delete"
            ? { body: JSON.stringify(req.body) }
            : {}),
          signal: AbortSignal.timeout(service.timeout || 30000),
        });

        const contentType = upstreamRes.headers.get("content-type") || "";
        const status = upstreamRes.status;

        if (contentType.includes("application/json")) {
          const data = await upstreamRes.json();
          res.status(status).json(data);
        } else {
          const text = await upstreamRes.text();
          res.status(status).type(contentType).send(text);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upstream request failed";
        console.error(`[proxy] ${service.name} error:`, message);
        res.status(502).json({
          error: "Bad Gateway",
          message: `Upstream service '${service.name}' failed: ${message}`,
        });
      }
    };

    // Register route: paywall → proxy handler
    router[method](routePath, paywall, handler);
    console.log(`  ${service.method || "POST"} ${routePath} → ${service.upstream} ($${service.price})`);
  }

  return router;
}
