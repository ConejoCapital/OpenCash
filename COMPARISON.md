# OpenCash vs AgentCash — Comparison

## Overview

| | **OpenCash** | **AgentCash** |
|---|---|---|
| **What** | Self-hosted x402 API proxy | Managed x402 API aggregation layer |
| **Built by** | Conejo Capital (open source) | Merit Systems (closed source) |
| **Model** | Operator runs their own proxy | SaaS — Merit Systems runs everything |
| **License** | MIT | No declared license |
| **Chain** | Solana | Base (Ethereum L2) |
| **Tokens** | USDC + PYUSD | USDC only |
| **API source** | Any upstream API you configure | ~136 curated endpoints across 6 origins |

---

## Architecture

### OpenCash
```
Agent → OpenCash proxy (self-hosted) → Upstream API (OpenAI, Gemini, etc.)
          ↓
    Built-in facilitator (USDC + PYUSD on Solana)
```

- **Operator-controlled**: You hold the API keys, set prices, run the infrastructure
- **Config-driven**: YAML file defines services, auth, and pricing
- **Built-in facilitator**: Verifies and settles payments locally (no external dependency)
- **Pass-through proxy**: Forwards request bodies to upstream, injects your credentials

### AgentCash
```
Agent → AgentCash MCP server (local) → Stable* origins (Merit Systems) → Underlying API
          ↓
    Merit Systems handles x402 + payment on Base
```

- **Platform-controlled**: Merit Systems holds all API keys and sets prices
- **MCP-driven**: Installed as `npx agentcash@latest`, integrates with Claude Code/Cursor
- **External facilitator**: Payment verification handled by the origin servers
- **Two-step for some APIs**: Async pattern (pay → poll) for social media and media generation

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

---

## Payment & Settlement

| | **OpenCash** | **AgentCash** |
|---|---|---|
| **Chain** | Solana (mainnet-beta) | Base (EIP-155:8453) |
| **Token** | USDC (SPL) + PYUSD (Token-2022) | USDC only |
| **Protocol** | x402 v1/v2 | x402 v2 + SIWX |
| **Facilitator** | Built-in (self-hosted) or external | Origin-hosted |
| **Settlement** | On-chain, real-time | On-chain, real-time |
| **Fee payer** | Operator's wallet | Origin's wallet |
| **Wallet** | Any Solana wallet (agent brings their own) | Auto-created EVM wallet (~/.agentcash/wallet.json) |

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
- Config hot-reload: restart to pick up changes

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
- Works out of the box for supported APIs

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

---

## Summary

| Dimension | OpenCash | AgentCash |
|-----------|----------|-----------|
| Control | Full (self-hosted) | None (SaaS) |
| Setup effort | Medium (config + deploy) | Zero (npx install) |
| API breadth | Unlimited (config any API) | 136+ curated |
| Chain | Solana | Base |
| Tokens | USDC + PYUSD | USDC |
| Pricing control | Operator sets prices | Merit Systems sets prices |
| Source | MIT open source | No declared license |
| Ideal user | Operators, builders | Agent developers |
