# OpenCash vs AgentCash vs PayAI Network — Comparison

These three projects occupy **different layers** of the x402 ecosystem:

- **OpenCash** — Self-hosted API proxy (merchant/operator layer)
- **AgentCash** — Managed API aggregation (client/agent layer)
- **PayAI Network** — Payment facilitator + AI marketplace (settlement layer)

They are complementary, not strictly competitive. OpenCash could use PayAI as its facilitator. An agent using AgentCash could pay an OpenCash-powered merchant.

---

## Overview

| | **OpenCash** | **AgentCash** | **PayAI Network** |
|---|---|---|---|
| **What** | Self-hosted x402 API proxy | Managed x402 API aggregation | x402 facilitator + AI marketplace |
| **Layer** | Merchant/operator | Client/agent | Settlement infrastructure |
| **Built by** | Conejo Capital | Merit Systems | Anonymous team |
| **Model** | Operator runs their own proxy | SaaS — Merit Systems runs everything | Facilitator-as-a-service + P2P marketplace |
| **License** | MIT | No declared license | Open source (MIT on plugins) |
| **Primary chain** | Solana | Base (Ethereum L2) | 16 chains (Solana, Base, Polygon, Avalanche, Sei, etc.) |
| **Tokens** | USDC + PYUSD | USDC only | USDC + PAYAI token |
| **API source** | Any upstream API you configure | ~136 curated endpoints across 6 origins | Not an API proxy — settles payments for any x402 merchant |

---

## How They Fit Together

```
┌─────────────────────────────────────────────────────────┐
│                    x402 Ecosystem                       │
│                                                         │
│  ┌──────────┐     ┌──────────────┐     ┌─────────────┐ │
│  │  Agent    │────▶│   Merchant   │────▶│ Facilitator │ │
│  │  (buyer)  │     │  (API proxy) │     │ (settlement)│ │
│  └──────────┘     └──────────────┘     └─────────────┘ │
│                                                         │
│  AgentCash         OpenCash            PayAI Network    │
│  (client SDK)      (server proxy)      (payment rail)   │
│                                                         │
│  Agent discovers → Agent pays → Facilitator settles     │
│  & calls APIs      via x402      on-chain               │
└─────────────────────────────────────────────────────────┘
```

---

## Architecture

### OpenCash — Merchant Layer
```
Agent → OpenCash proxy (self-hosted) → Upstream API (OpenAI, Gemini, etc.)
          ↓
    Built-in facilitator (USDC + PYUSD on Solana)
```

- **Operator-controlled**: You hold the API keys, set prices, run the infrastructure
- **Config-driven**: YAML file defines services, auth, and pricing
- **Built-in facilitator**: Verifies and settles payments locally (no external dependency)
- **Pass-through proxy**: Forwards request bodies to upstream, injects your credentials

### AgentCash — Client Layer
```
Agent → AgentCash MCP server (local) → Stable* origins (Merit Systems) → Underlying API
          ↓
    Merit Systems handles x402 + payment on Base
```

- **Platform-controlled**: Merit Systems holds all API keys and sets prices
- **MCP-driven**: Installed as `npx agentcash@latest`, integrates with Claude Code/Cursor
- **External facilitator**: Payment verification handled by the origin servers
- **Two-step for some APIs**: Async pattern (pay → poll) for social media and media generation

### PayAI Network — Settlement Layer
```
Agent → Any x402 Merchant → PayAI Facilitator → On-chain settlement
                                    ↓
                        Covers gas fees, verifies tx, confirms
```

- **Facilitator role**: Validates signed transactions, submits on-chain, confirms settlement
- **Gasless**: PayAI covers all blockchain transaction fees for both buyer and merchant
- **Multi-chain**: Settles on Solana, Base, Polygon, Avalanche, Sei, and 11 more networks
- **AI Marketplace**: Separate product — P2P agent-to-agent commerce via ElizaOS + libp2p

---

## Supported APIs

### OpenCash — Unlimited (Config-Driven)
Add any API with an HTTP endpoint. Example config supports:
- OpenAI (chat, embeddings)
- Anthropic (Claude)
- Google Gemini (Flash, Pro)
- Serper (search, news)
- Any REST API with header-based auth

**Adding a new API**: Edit `opencash.config.yaml`, restart.

### AgentCash — 136+ Curated Endpoints

| Origin | Category | Endpoints | Price Range |
|--------|----------|-----------|-------------|
| StableEnrich | Search, people/org data, LinkedIn, maps | 29 | $0.01–$0.44 |
| StableSocial | TikTok, Instagram, X, Facebook, Reddit | 45 | $0.06 each |
| StableStudio | Image/video generation (7+ models) | 24 | $0.01–$12.50 |
| StableUpload | File hosting, static sites | 10 | $0.02–$2.00 |
| StableEmail | Email send/receive, custom domains | 23 | $0.001–$5.00 |
| twit.sh | Twitter/X API (3rd party) | 22 | $0.0025–$0.01 |

**Adding a new API**: Not possible — only Merit Systems can add origins.

### PayAI Network — Not an API Proxy
PayAI doesn't proxy APIs. It provides:
- **x402 Facilitator**: Settlement service for any x402 merchant
- **Echo Merchant**: Free test endpoint with instant refunds
- **AI Marketplace**: P2P agent service discovery and escrow contracts
- **MCPay**: Monetize MCP servers with x402 paywalls

**Relationship to OpenCash**: PayAI could be used as OpenCash's facilitator by setting `FACILITATOR_URL=https://facilitator.payai.network`. This would give OpenCash multi-chain settlement and gasless transactions.

---

## Payment & Settlement

| | **OpenCash** | **AgentCash** | **PayAI Network** |
|---|---|---|---|
| **Chain** | Solana | Base | 16 chains (Solana, Base, Polygon, Avalanche, Sei, etc.) |
| **Token** | USDC (SPL) + PYUSD (Token-2022) | USDC only | USDC (all chains) + custom tokens via Token Gateway |
| **Protocol** | x402 v1/v2 | x402 v2 + SIWX | x402 v1/v2 |
| **Facilitator** | Built-in or external | Origin-hosted | PayAI IS the facilitator |
| **Settlement** | On-chain, real-time | On-chain, real-time | On-chain, < 1 second |
| **Gas fees** | Operator pays | Origin pays | PayAI covers all gas (gasless) |
| **Fee payer** | Operator's wallet | Origin's wallet | PayAI's wallet |
| **Wallet** | Any Solana wallet | Auto-created EVM wallet | Any wallet on supported chains |

---

## Pricing Model

### OpenCash
- **You set the price** for every service in your config
- Price per request, denominated in USD, converted to token base units
- Zero markup — you pay the upstream API cost, agents pay what you charge
- Full transparency: config file is the source of truth

### AgentCash
- **Merit Systems sets prices** as an intermediary
- Price per request, fixed per endpoint
- Markup is opaque — underlying API costs are not disclosed
- Range: $0.001 (message listing) to $12.50 (Sora 2 Pro video)

### PayAI Network
- **Facilitator fee**: First 1,000 settlements free, then $0.001/settlement
- **No API keys required** for any tier
- **Zero gas fees** for merchants and buyers
- 99.9% payment success rate
- Rate limit: 4 RPS, 480 burst/min (free and pay-as-you-go tiers)

---

## Developer Experience

### OpenCash
```bash
# Setup
git clone https://github.com/ConejoCapital/OpenCash
npm install
cp .env.example .env  # Add keys
# Edit opencash.config.yaml
npm run dev

# Agent discovers services
curl http://localhost:4020/v1/discover
```

- Express.js server, TypeScript
- Docker + docker-compose for deployment
- CI/CD with GitHub Actions

### AgentCash
```bash
# Setup — just install the MCP server
npx -y agentcash@latest

# Agent discovers services via MCP tools
# discover_api_endpoints → check_endpoint_schema → fetch
```

- MCP server, integrates directly with AI IDEs
- No self-hosting required
- Auto-wallet creation with onboarding bonus ($25)

### PayAI Network
```bash
# As a merchant — point your x402 middleware at PayAI
FACILITATOR_URL=https://facilitator.payai.network npm run dev

# As an agent — use the MCP server
# npx payai-mcp-server
```

- npm packages: `@payai/x402`, `@payai/facilitator`, `@payai/x402-solana-react`
- Echo merchant for testing with instant refunds
- ElizaOS plugin for AI agent marketplace
- Merchant portal at merchant.payai.network

---

## Open Source Status

| | **OpenCash** | **AgentCash** | **PayAI Network** |
|---|---|---|---|
| **Server/core** | MIT | No license declared | Open (MIT on plugins) |
| **API backends** | N/A (operator's upstream APIs) | Closed (Stable* origins proprietary) | N/A (facilitator only) |
| **Client SDK** | Standard x402 libraries | Published on npm, no license | `@payai/x402` on npm |
| **GitHub** | [ConejoCapital/OpenCash](https://github.com/ConejoCapital/OpenCash) | Merit-Systems org | [PayAINetwork org](https://github.com/PayAINetwork) |
| **Team** | Known (Conejo Capital) | Known (Merit Systems, Brooklyn) | Anonymous |

---

## Trade-offs

### Choose OpenCash when:
- You want **full control** over pricing, infrastructure, and API keys
- You need **Solana-native** payments (USDC + PYUSD)
- You want to gate **your own APIs** or custom upstream services
- You need **transparency** in pricing and no middleman markup
- You're building an **operator business** (reselling API access)
- You want **open-source** you can audit, fork, and modify

### Choose AgentCash when:
- You want **zero setup** — install and go
- You need access to **136+ pre-integrated APIs** (social media, enrichment, media generation)
- You prefer **Base/EVM** chain for payments
- You don't want to manage API keys or infrastructure
- You're an **agent developer** who just needs API access, not an operator
- You want **MCP-native** integration with Claude Code, Cursor, etc.

### Choose PayAI Network when:
- You need **multi-chain settlement** (16 networks including Solana + EVM)
- You want **gasless transactions** — PayAI covers all blockchain fees
- You're building a **merchant** and need a facilitator without running your own
- You want your service **auto-listed** in the x402 Bazaar for discovery
- You're building **autonomous agents** that need P2P discovery and escrow
- You need **x402 protocol compatibility** across the widest range of chains

### Combining them:
- **OpenCash + PayAI**: Use PayAI as OpenCash's facilitator for multi-chain settlement and gasless transactions. Set `FACILITATOR_URL=https://facilitator.payai.network` in your `.env`.
- **OpenCash + AgentCash**: An AgentCash-powered agent could pay an OpenCash-powered merchant, if both support the same chain/token.

---

## Limitations

### OpenCash
- Requires self-hosting (server + Solana fee payer wallet with SOL)
- Operator must obtain and manage upstream API keys
- No built-in MCP server (agents use standard x402 HTTP flow)
- Currently Solana-only (no EVM chain support yet)
- No async/polling pattern for long-running operations

### AgentCash
- **Single chain**: Base only — no Solana support
- **USDC only**: No PYUSD or other stablecoins
- **Centralized**: Merit Systems is a single point of failure
- **Vendor lock-in**: Cannot add custom APIs or self-host
- **No spending controls**: No built-in budget caps or rate limits
- **Opaque pricing**: Markup over underlying API costs is not disclosed
- **No open-source license**: Legal ambiguity for derivative works
- **Local-only wallet**: No backup/recovery — lose the file, lose the funds

### PayAI Network
- **Anonymous team**: No known founders — trust risk for production use
- **PAYAI token**: Launched on pump.fun — raises legitimacy questions
- **Not an API proxy**: Facilitator only — you still need a merchant layer (like OpenCash)
- **Smaller market share**: ~14% of x402 settlements vs Coinbase's ~80%
- **Small community**: GitHub repos have 2–5 stars
- **Rate limits**: 4 RPS on free and pay-as-you-go tiers

---

## Summary

| Dimension | OpenCash | AgentCash | PayAI Network |
|-----------|----------|-----------|---------------|
| **Layer** | Merchant (API proxy) | Client (agent SDK) | Settlement (facilitator) |
| **Control** | Full (self-hosted) | None (SaaS) | Partial (facilitator service) |
| **Setup effort** | Medium (config + deploy) | Zero (npx install) | Zero (point facilitator URL) |
| **API breadth** | Unlimited (config any API) | 136+ curated | N/A (not an API proxy) |
| **Chains** | Solana | Base | 16 chains |
| **Tokens** | USDC + PYUSD | USDC | USDC + custom |
| **Gas fees** | Operator pays | Origin pays | PayAI covers (gasless) |
| **Pricing control** | Operator sets prices | Merit Systems sets prices | $0.001/settlement |
| **Source** | MIT open source | No declared license | Open source (MIT plugins) |
| **Team** | Known | Known | Anonymous |
| **Ideal user** | Operators, builders | Agent developers | Merchants needing multi-chain settlement |
