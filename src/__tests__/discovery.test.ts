import { describe, it, expect } from "vitest";
import express from "express";
import { createDiscoveryRouter } from "../routes/discovery.js";
import type { OpenCashConfig } from "../types.js";

// Minimal test helper — no supertest needed, just test the route handler
function createTestApp(config: OpenCashConfig) {
  const app = express();
  app.use(createDiscoveryRouter(config));
  return app;
}

const testConfig: OpenCashConfig = {
  operator: {
    name: "test-operator",
    chain: "solana",
    network: "mainnet-beta",
    payment_address: "SomeAddress",
  },
  tokens: [
    { symbol: "USDC", mint: "EPjFW...", decimals: 6, program: "spl-token" },
    { symbol: "PYUSD", mint: "2b1kV...", decimals: 6, program: "token-2022" },
  ],
  services: [
    {
      name: "openai-chat",
      description: "OpenAI GPT-4o",
      upstream: "https://api.openai.com/v1/chat/completions",
      method: "POST",
      price: "0.005",
    },
    {
      name: "gemini-flash",
      description: "Gemini 2.5 Flash",
      upstream: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      method: "POST",
      price: "0.001",
    },
  ],
};

describe("GET /v1/discover", () => {
  it("returns discovery response with correct shape", async () => {
    const app = createTestApp(testConfig);

    // Use Node's built-in http to test without supertest
    const server = app.listen(0);
    const addr = server.address() as { port: number };

    try {
      const res = await fetch(`http://localhost:${addr.port}/v1/discover`);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.operator).toBe("test-operator");
      expect(body.chain).toBe("solana");
      expect(body.network).toBe("mainnet-beta");
      expect(body.services).toHaveLength(2);
      expect(body.tokens).toHaveLength(2);
    } finally {
      server.close();
    }
  });

  it("returns correct service info", async () => {
    const app = createTestApp(testConfig);
    const server = app.listen(0);
    const addr = server.address() as { port: number };

    try {
      const res = await fetch(`http://localhost:${addr.port}/v1/discover`);
      const body = await res.json();

      const svc = body.services[0];
      expect(svc.name).toBe("openai-chat");
      expect(svc.endpoint).toBe("/v1/proxy/openai-chat");
      expect(svc.price).toBe("$0.005");
      expect(svc.tokens).toEqual(["USDC", "PYUSD"]);
    } finally {
      server.close();
    }
  });
});
