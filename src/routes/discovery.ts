/**
 * OpenCash — Service discovery endpoint.
 * GET /v1/discover — returns all available services, prices, and accepted tokens.
 */

import express from "express";
import type { OpenCashConfig, DiscoveryResponse, ServiceInfo } from "../types.js";

export function createDiscoveryRouter(config: OpenCashConfig): express.Router {
  const router = express.Router();

  router.get("/v1/discover", (_req, res) => {
    const services: ServiceInfo[] = config.services.map((svc) => ({
      name: svc.name,
      description: svc.description,
      method: svc.method || "POST",
      endpoint: `/v1/proxy/${svc.name}`,
      price: `$${svc.price}`,
      tokens: config.tokens.map((t) => t.symbol),
    }));

    const response: DiscoveryResponse = {
      operator: config.operator.name,
      chain: config.operator.chain,
      network: config.operator.network,
      services,
      tokens: config.tokens.map((t) => ({
        symbol: t.symbol,
        mint: t.mint,
        program: t.program,
      })),
    };

    res.json(response);
  });

  return router;
}
