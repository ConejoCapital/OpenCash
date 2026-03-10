import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { interpolateEnv, validateConfig } from "../config.js";
import type { OpenCashConfig } from "../types.js";

describe("interpolateEnv", () => {
  beforeEach(() => {
    process.env.TEST_KEY = "test-value";
    process.env.ANOTHER_KEY = "another-value";
  });

  afterEach(() => {
    delete process.env.TEST_KEY;
    delete process.env.ANOTHER_KEY;
  });

  it("replaces ${ENV_VAR} with env value", () => {
    expect(interpolateEnv("Bearer ${TEST_KEY}")).toBe("Bearer test-value");
  });

  it("replaces multiple env vars in one string", () => {
    expect(interpolateEnv("${TEST_KEY}:${ANOTHER_KEY}")).toBe(
      "test-value:another-value",
    );
  });

  it("returns string unchanged if no env vars", () => {
    expect(interpolateEnv("plain string")).toBe("plain string");
  });

  it("throws on missing env var", () => {
    expect(() => interpolateEnv("${MISSING_VAR}")).toThrow(
      "Missing environment variable: MISSING_VAR",
    );
  });
});

describe("validateConfig", () => {
  const validConfig: OpenCashConfig = {
    operator: {
      name: "test",
      chain: "solana",
      network: "mainnet-beta",
      payment_address: "SomeAddress123",
    },
    tokens: [
      { symbol: "USDC", mint: "EPjFW...", decimals: 6, program: "spl-token" },
    ],
    services: [
      {
        name: "test-svc",
        description: "Test",
        upstream: "https://api.example.com",
        method: "POST",
        price: "0.005",
      },
    ],
  };

  it("accepts valid config", () => {
    expect(() => validateConfig(validConfig)).not.toThrow();
  });

  it("rejects missing operator", () => {
    const bad = { ...validConfig, operator: undefined as any };
    expect(() => validateConfig(bad)).toThrow("operator");
  });

  it("rejects missing payment_address", () => {
    const bad = {
      ...validConfig,
      operator: { ...validConfig.operator, payment_address: "" },
    };
    expect(() => validateConfig(bad)).toThrow("payment_address");
  });

  it("rejects empty tokens", () => {
    const bad = { ...validConfig, tokens: [] };
    expect(() => validateConfig(bad)).toThrow("at least one token");
  });

  it("rejects empty services", () => {
    const bad = { ...validConfig, services: [] };
    expect(() => validateConfig(bad)).toThrow("at least one service");
  });

  it("rejects duplicate service names", () => {
    const bad = {
      ...validConfig,
      services: [validConfig.services[0], validConfig.services[0]],
    };
    expect(() => validateConfig(bad)).toThrow("Duplicate service name");
  });

  it("rejects invalid price", () => {
    const bad = {
      ...validConfig,
      services: [{ ...validConfig.services[0], price: "free" }],
    };
    expect(() => validateConfig(bad)).toThrow("invalid price");
  });

  it("rejects zero price", () => {
    const bad = {
      ...validConfig,
      services: [{ ...validConfig.services[0], price: "0" }],
    };
    expect(() => validateConfig(bad)).toThrow("invalid price");
  });
});
