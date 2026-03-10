# OpenCash

**Open-source universal x402 API proxy** — gate any upstream API behind stablecoin micropayments on Solana.

Define your upstream APIs, auth, and pricing in a YAML config file. OpenCash dynamically generates x402-gated Express routes for each service. No code changes needed to add new APIs — just edit the config.

## Quick Start

```bash
# Clone and install
git clone https://github.com/ConejoCapital/OpenCash.git
cd OpenCash
npm install

# Configure
cp .env.example .env
# Edit .env with your SVM_PRIVATE_KEY and PAYMENT_RECIPIENT_ADDRESS
# Edit opencash.config.yaml with your upstream services

# Run
npm run dev
```

## How It Works

```
Agent (USDC/PYUSD wallet)
    │
    ├─ GET  /v1/discover             → List all services + prices (free)
    ├─ GET  /health                  → Server status (free)
    ├─ POST /v1/proxy/openai-chat    → OpenAI GPT-4o ($0.005, x402 paywall)
    ├─ POST /v1/proxy/gemini-flash   → Gemini 2.5 Flash ($0.001, x402 paywall)
    ├─ POST /v1/proxy/serper-search  → Serper Search ($0.002, x402 paywall)
    └─ ...any service from config
    │
    └── Built-in facilitator verifies & settles payment on Solana
```

1. Agent calls a proxy endpoint → gets `402 Payment Required`
2. x402 client builds & signs a USDC/PYUSD transfer on Solana
3. Built-in facilitator verifies the payment and settles on-chain
4. Request is forwarded to the upstream API with operator's credentials
5. Response is returned to the agent

## Configuration

### `opencash.config.yaml`

```yaml
operator:
  name: "my-proxy"
  chain: solana
  network: mainnet-beta
  payment_address: "${PAYMENT_RECIPIENT_ADDRESS}"

tokens:
  - symbol: USDC
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    decimals: 6
    program: spl-token
  - symbol: PYUSD
    mint: "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo"
    decimals: 6
    program: token-2022

services:
  - name: openai-chat
    description: "OpenAI GPT-4o chat completions"
    upstream: https://api.openai.com/v1/chat/completions
    method: POST
    auth:
      header: Authorization
      value: "Bearer ${OPENAI_API_KEY}"
    price: "0.005"
```

Each service becomes `POST /v1/proxy/{name}` with an x402 paywall at the configured price.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SVM_PRIVATE_KEY` | Yes | Base58 Solana private key (fee payer) |
| `PAYMENT_RECIPIENT_ADDRESS` | Yes | Solana address to receive payments |
| `SOLANA_RPC_URL` | No | RPC URL (default: public mainnet) |
| `FACILITATOR_URL` | No | External facilitator (default: built-in) |
| `PORT` | No | Server port (default: 4020) |
| `OPENCASH_CONFIG` | No | Config file path (default: ./opencash.config.yaml) |

## Accepted Tokens

| Token | Program | Mainnet Mint |
|-------|---------|-------------|
| USDC | SPL Token | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| PYUSD | Token-2022 | `2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo` |

Both have 6 decimals. The built-in facilitator handles both SPL Token and Token-2022 transfers.

## Development

```bash
npm run dev        # Start with tsx (hot reload)
npm run build      # TypeScript compile
npm run typecheck  # Type check without emit
npm test           # Run tests
npm start          # Run compiled JS
```

## Docker

```bash
# Build and run
docker compose up -d

# Or build manually
docker build -t opencash .
docker run -p 4020:4020 -p 4021:4021 --env-file .env -v ./opencash.config.yaml:/app/opencash.config.yaml:ro opencash
```

## Architecture

- **Config-driven**: YAML config defines all upstream services, auth, and pricing
- **x402 protocol**: Standard HTTP 402 payment flow with Solana stablecoins
- **Built-in facilitator**: Verifies and settles payments (USDC + PYUSD/Token-2022)
- **Pass-through proxy**: Forwards request bodies as-is, only injects operator auth

## Adding a New Service

1. Add an entry to `opencash.config.yaml`:
   ```yaml
   - name: my-api
     description: "My API description"
     upstream: https://api.example.com/endpoint
     method: POST
     auth:
       header: Authorization
       value: "Bearer ${MY_API_KEY}"
     price: "0.003"
   ```
2. Add `MY_API_KEY` to your `.env`
3. Restart the server

The service is now available at `POST /v1/proxy/my-api` with an x402 paywall.

## License

MIT
