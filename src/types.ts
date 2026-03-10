/**
 * OpenCash — Type definitions for config, runtime, and API responses.
 */

// ── Config types (parsed from opencash.config.yaml) ──

export interface TokenConfig {
  symbol: string;
  mint: string;
  decimals: number;
  program: "spl-token" | "token-2022";
}

export interface ServiceConfig {
  name: string;
  description: string;
  upstream: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  auth?: {
    header: string;
    value: string;
  };
  headers?: Record<string, string>;
  price: string;
  timeout?: number;
}

export interface OperatorConfig {
  name: string;
  chain: string;
  network: string;
  payment_address: string;
}

export interface OpenCashConfig {
  operator: OperatorConfig;
  tokens: TokenConfig[];
  services: ServiceConfig[];
}

// ── Runtime types ──

export type Network = `${string}:${string}`;

export interface RuntimeConfig {
  config: OpenCashConfig;
  network: Network;
  facilitatorUrl: string;
  port: number;
}

// ── API response types ──

export interface ServiceInfo {
  name: string;
  description: string;
  method: string;
  endpoint: string;
  price: string;
  tokens: string[];
}

export interface DiscoveryResponse {
  operator: string;
  chain: string;
  network: string;
  services: ServiceInfo[];
  tokens: {
    symbol: string;
    mint: string;
    program: string;
  }[];
}

export interface HealthResponse {
  status: "ok";
  uptime: number;
  serviceCount: number;
  version: string;
}

export interface PaymentOption {
  scheme: "exact";
  amount: string;
  maxAmountRequired: string;
  asset: string;
  network: Network;
  payTo: string;
  description: string;
  maxTimeoutSeconds: number;
}
