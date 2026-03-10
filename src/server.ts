/**
 * OpenCash — Express app factory.
 * Wires middleware, discovery, health, and proxy routes.
 */

import express from "express";
import { createProxyRouter } from "./proxy.js";
import { createDiscoveryRouter } from "./routes/discovery.js";
import { createHealthRouter } from "./routes/health.js";
import type { OpenCashConfig, Network } from "./types.js";

export async function createApp(
  config: OpenCashConfig,
  network: Network,
  facilitatorUrl: string,
): Promise<express.Express> {
  const app = express();

  // Body parsing
  app.use(express.json({ limit: "1mb" }));

  // Free endpoints
  app.use(createHealthRouter(config));
  app.use(createDiscoveryRouter(config));

  // x402-gated proxy routes
  console.log("\nRegistering proxy routes:");
  const proxyRouter = await createProxyRouter(config, network, facilitatorUrl);
  app.use(proxyRouter);

  // 404 fallback
  app.use((_req, res) => {
    res.status(404).json({
      error: "Not Found",
      message: "Use GET /v1/discover to see available services",
    });
  });

  return app;
}
