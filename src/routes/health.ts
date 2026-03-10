/**
 * OpenCash — Health check endpoint.
 * GET /health — server status, uptime, service count.
 */

import express from "express";
import type { OpenCashConfig, HealthResponse } from "../types.js";

const startTime = Date.now();

export function createHealthRouter(config: OpenCashConfig): express.Router {
  const router = express.Router();

  router.get("/health", (_req, res) => {
    const response: HealthResponse = {
      status: "ok",
      uptime: Math.floor((Date.now() - startTime) / 1000),
      serviceCount: config.services.length,
      version: process.env.npm_package_version || "0.1.0",
    };

    res.json(response);
  });

  return router;
}
