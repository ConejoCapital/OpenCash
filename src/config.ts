/**
 * OpenCash — Config loader.
 * Reads opencash.config.yaml, interpolates ${ENV_VAR} references, validates.
 */

import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import type { OpenCashConfig, Network } from "./types.js";

/**
 * Interpolate ${ENV_VAR} placeholders in a string with process.env values.
 * Throws if an env var is referenced but not set.
 */
export function interpolateEnv(value: string): string {
  return value.replace(/\$\{([^}]+)\}/g, (match, envKey: string) => {
    const envValue = process.env[envKey];
    if (envValue === undefined) {
      throw new Error(`Missing environment variable: ${envKey} (referenced in config)`);
    }
    return envValue;
  });
}

/**
 * Recursively walk an object and interpolate all string values.
 */
function interpolateDeep(obj: unknown): unknown {
  if (typeof obj === "string") return interpolateEnv(obj);
  if (Array.isArray(obj)) return obj.map(interpolateDeep);
  if (obj !== null && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = interpolateDeep(value);
    }
    return result;
  }
  return obj;
}

/**
 * Validate a parsed config object. Throws descriptive errors.
 */
export function validateConfig(config: OpenCashConfig): void {
  if (!config.operator) throw new Error("Config missing 'operator' section");
  if (!config.operator.payment_address) {
    throw new Error("Config missing 'operator.payment_address'");
  }
  if (!config.tokens || config.tokens.length === 0) {
    throw new Error("Config must define at least one token");
  }
  if (!config.services || config.services.length === 0) {
    throw new Error("Config must define at least one service");
  }

  // Check for duplicate service names
  const names = new Set<string>();
  for (const svc of config.services) {
    if (!svc.name) throw new Error("Each service must have a 'name'");
    if (!svc.upstream) throw new Error(`Service '${svc.name}' missing 'upstream' URL`);
    if (!svc.price) throw new Error(`Service '${svc.name}' missing 'price'`);
    if (names.has(svc.name)) {
      throw new Error(`Duplicate service name: '${svc.name}'`);
    }
    names.add(svc.name);

    // Validate price is a parseable number
    const price = parseFloat(svc.price);
    if (isNaN(price) || price <= 0) {
      throw new Error(`Service '${svc.name}' has invalid price: '${svc.price}'`);
    }
  }

  // Validate tokens
  for (const token of config.tokens) {
    if (!token.symbol) throw new Error("Each token must have a 'symbol'");
    if (!token.mint) throw new Error(`Token '${token.symbol}' missing 'mint' address`);
    if (typeof token.decimals !== "number") {
      throw new Error(`Token '${token.symbol}' missing 'decimals'`);
    }
  }
}

/**
 * Load and parse the config file.
 * @param configPath - Path to opencash.config.yaml (default: ./opencash.config.yaml)
 */
export function loadConfig(configPath?: string): OpenCashConfig {
  const resolvedPath = configPath || path.resolve("opencash.config.yaml");

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(
      `Config file not found: ${resolvedPath}\n` +
      `Create one from the template: cp examples/opencash.config.yaml opencash.config.yaml`
    );
  }

  const raw = fs.readFileSync(resolvedPath, "utf8");
  const parsed = yaml.load(raw) as OpenCashConfig;

  // Interpolate env vars
  const config = interpolateDeep(parsed) as OpenCashConfig;

  // Validate
  validateConfig(config);

  return config;
}

/**
 * Solana cluster name → CAIP-2 genesis hash mapping.
 * @faremeter requires the genesis hash format, not human-readable names.
 */
const SOLANA_NETWORK_MAP: Record<string, string> = {
  "mainnet-beta": "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  "devnet": "EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
  "testnet": "4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z",
};

/**
 * Build CAIP-2 network identifier from config.
 * Maps human-readable Solana cluster names to genesis hash format.
 */
export function getNetworkCaip2(config: OpenCashConfig): Network {
  const network = config.operator.chain === "solana"
    ? SOLANA_NETWORK_MAP[config.operator.network] || config.operator.network
    : config.operator.network;
  return `${config.operator.chain}:${network}` as Network;
}
