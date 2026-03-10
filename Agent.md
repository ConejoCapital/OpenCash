# OpenCash — Agent Integration Guide

## Overview

OpenCash is a universal x402 API proxy. Agents pay with USDC or PYUSD on Solana to access upstream APIs (OpenAI, Gemini, Anthropic, etc.) through a single gateway.

## For AI Agents

### 1. Discover Available Services

```
GET /v1/discover
```

Returns all available services, prices, and accepted tokens. No payment required.

```json
{
  "operator": "acme-proxy",
  "chain": "solana",
  "network": "mainnet-beta",
  "services": [
    {
      "name": "openai-chat",
      "description": "OpenAI GPT-4o chat completions",
      "method": "POST",
      "endpoint": "/v1/proxy/openai-chat",
      "price": "$0.005",
      "tokens": ["USDC", "PYUSD"]
    }
  ],
  "tokens": [
    { "symbol": "USDC", "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "program": "spl-token" },
    { "symbol": "PYUSD", "mint": "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo", "program": "token-2022" }
  ]
}
```

### 2. Make a Paid Request

Send a request to any service endpoint. The x402 flow is:

1. **First request** → `402 Payment Required` with payment details in headers
2. **x402 client** builds a USDC/PYUSD transfer transaction on Solana
3. **Retry** with signed payment attached
4. **Server** verifies payment, forwards to upstream API, returns response

### 3. Payment Details

- **Chain**: Solana (mainnet-beta)
- **Tokens**: USDC (SPL Token) or PYUSD (Token-2022)
- **Protocol**: x402 v2 with `exact` scheme
- **Settlement**: On-chain, real-time

### 4. Required Wallet Setup

Your agent needs:
- A Solana wallet with SOL (for transaction fees, ~0.001 SOL per tx)
- USDC or PYUSD balance (for payments)
- An x402-compatible client library (`@x402/fetch` + `@x402/svm`)

### 5. Example Client Code

```typescript
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { ExactSvmScheme } from "@x402/svm/exact/client";
import { createKeyPairSignerFromBytes } from "@solana/kit";
import { base58 } from "@scure/base";

const signer = await createKeyPairSignerFromBytes(base58.decode(PRIVATE_KEY));
const client = new x402Client();
client.register("solana:*", new ExactSvmScheme(signer));
const fetchPaid = wrapFetchWithPayment(fetch, client);

// Paid request — x402 handles payment automatically
const res = await fetchPaid("https://opencash.example.com/v1/proxy/openai-chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "gpt-4o",
    messages: [{ role: "user", content: "Hello" }]
  })
});
```

## Health Check

```
GET /health
```

Returns server status, uptime, and service count. No payment required.
