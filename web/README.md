# Dometrics

An AI-driven domain analytics platform that computes real-time risk, rarity, momentum, and forecast scores for tokenized domains using on-chain data from Doma Protocol.

## The Problem

Tokenized domain markets operate with incomplete information. Traders lack visibility into expiry risk, market momentum, and comparative rarity across TLDs. Without analytics infrastructure, participants can't identify undervalued domains or assess portfolio risk efficiently.

## Our Solution

Dometrics performs client-side score computation using Doma's GraphQL Subgraph and smart contract reads. The system calculates four metrics:

**Risk Score (0-100)**: Weighs expiry buffer (45%), lock status (25%), registrar quality (15%), renewal history (10%), and liquidity (5%). Domains expiring in <30 days score high-risk, while those with 180+ days and active offers score low-risk.

**Rarity Score (0-100)**: Evaluates name length (40%), dictionary/brandable patterns (25%), TLD scarcity (25%), and historic demand (10%). Short, memorable names in uncommon TLDs rank highest.

**Momentum Score (0-100)**: Compares 7-day vs 30-day activity deltas (70%) and recent events (30%). Detects trending domains before price discovery.

**Forecast**: Linear blend predicting 6-month value trajectories with confidence intervals. Incorporates momentum, rarity, and inverse risk to identify growth opportunities.

All scores compute in-browser from fresh on-chain state—no backend database, no stale data.

## Technical Architecture

### Client-Heavy Design
- Direct GraphQL queries to Doma Subgraph for domain metadata and activity
- Batched multicall reads via viem for `expirationOf`, `lockStatusOf`, and `registrarOf`
- IndexedDB caching for API responses and computed scores
- React Query for request deduplication and optimistic updates

### Natural Language Search
Built-in query parser handles patterns like "low risk domains", "expiring in 30 days", or "high growth potential >15%". Regex-based extraction converts user intent into filter parameters and sorting logic. Search suggestions appear in real-time with a Sparkles icon indicating AI-powered parsing.

### Scoring Algorithm
Weights stored in `/config/weights.v1.json` for live tuning. Algorithm normalizes each dimension 0-1, applies feature-specific multipliers, and outputs final scores. Forecast uses `base * (1 + 0.5*momentum_norm + 0.3*rarity_norm - 0.4*risk_norm)` with ±10% confidence bands.

### Alert System
In-app and browser push notifications trigger on user-defined thresholds: expiry <30 days, risk >70, or forecast growth >15%. Tracked domains stored in localStorage; offer count changes detected via periodic polling.

## Key Features

**Portfolio Dashboard**: Browse 50+ testnet domains with instant filtering by TLD, length, score ranges, and high-growth potential flag. Fire icon (🔥) marks domains with >15% projected appreciation.

**Domain Detail Pages**: Full breakdown of scoring factors, 7/30-day activity sparklines, forecast charts with confidence intervals, and "Why This Score" explainers.

**Analytics Hub**: TLD distribution pie charts, risk histograms, and scatter plots showing risk vs rarity positioning. Time-range selector (7d/30d/90d) triggers chart re-renders with visual feedback.

**Deep Linking**: Every domain and transaction links to Doma Explorer. One-click access to orderbook pages (read-only in MVP).

## Doma Protocol Integration

### GraphQL Subgraph - Core Data Source
All domain data flows through Doma's multi-chain GraphQL Subgraph at `https://api-testnet.doma.xyz/graphql`. The system executes direct queries with no intermediate caching layer:

**Discovery & Metadata**:
```graphql
query MyNames($take: Int) {
  names(take: $take) {
    items {
      name, expiresAt, tokenizedAt
      registrar { name, ianaId }
      transferLock, claimedBy
      tokens { tokenId, tokenAddress, ownerAddress, expiresAt, explorerUrl }
    }
  }
}
```

**Market Intelligence**:
```graphql
query NameStatistics($tokenId: String!) {
  nameStatistics(tokenId: $tokenId) {
    name, activeOffers, offersLast3Days
    highestOffer { price, offererAddress, currency { symbol, decimals, usdExchangeRate } }
  }
}
```

**Activity History**:
```graphql
query TokenActivities($tokenId: String, $take: Int) {
  tokenActivities(tokenId: $tokenId, take: $take) {
    items {
      ... on TokenPurchasedActivity { type, tokenId, name, createdAt, seller, buyer, payment { price, currencySymbol } }
      ... on TokenListedActivity { type, name, createdAt, price { price, currencySymbol } }
    }
  }
}
```

**Offers & Listings**:
- `offers(tokenId: ...)` for bid analysis (requires tokenId; no global browse)
- `listings(...)` for asking prices (fetch all, filter client-side)

### Smart Contract Integration
- Ownership token reads for accurate expiry dates and lock status
- Multicall batching via `viem.multicall3` for 50+ domains in ~5 seconds
- Fallback to individual `readContract` calls when multicall3 unavailable
- Functions: `expirationOf(tokenId)`, `lockStatusOf(tokenId)`, `registrarOf(tokenId)`

### Market Value Determination
Priority-based pricing model aggregates multiple data sources:
1. Recent sale price from `TokenPurchasedActivity` (95% confidence)
2. Highest offer from `nameStatistics.highestOffer` (85% confidence)
3. Active offers from `offers` query (75% confidence)
4. Lowest listing from `listings` query (65% confidence)
5. Formula-based calculation from domain characteristics (50% confidence)

Landing page uses fast `nameStatistics` queries (1 API call per domain). Detail pages execute `getRealMarketValue()` for complete market history across all activity types.

## Technology Stack

**Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
**Blockchain**: Viem (contract reads, multicall), GraphQL (Doma API)
**Charts**: Highcharts for analytics visualizations
**Caching**: IndexedDB for persistence, TanStack Query for memory
**Deployment**: Vercel with optional Upstash KV for hot query caching

## Performance Optimizations

- Batch contract calls via multicall for 10x speedup
- 5-15min cache for popular GraphQL queries
- Client-side score computation (zero backend latency)
- Progressive loading with skeleton screens
- Vercel Cron for periodic cohort precomputation

## Getting Started

```bash
cd web
npm install
npm run dev
```

Environment variables (`.env.local`):
```
NEXT_PUBLIC_DOMA_API_KEY=your_api_key
DOMA_API_KEY=your_api_key
BASE_SEPOLIA_PRIVATE_KEY=your_private_key  # optional, for future writes
```

Open [http://localhost:3000](http://localhost:3000). The app connects to Doma testnet (chain ID 97476) and loads real domain data immediately.

## Smart Contract Addresses

**Doma Testnet (97476)**
- RPC: `https://rpc-testnet.doma.xyz`
- Subgraph: `https://api-testnet.doma.xyz/graphql`
- Explorer: `https://explorer-testnet.doma.xyz`

## Project Structure

```
web/
├── src/
│   ├── app/              # Next.js 14 app router
│   ├── components/       # React components
│   ├── lib/
│   │   ├── doma-client.ts       # Doma API integration
│   │   ├── scoring.ts           # Score calculation engine
│   │   ├── natural-language-search.ts  # NL query parser
│   │   └── cache.ts             # Client-side caching
│   └── config/
│       └── weights.v1.json      # Scoring weights
└── public/
    └── config/                  # Public configuration
```

## Screenshots

### Analytics Dashboard
![Analytics Dashboard](./public/screenshots/analytics-dashboard.png)
*TLD distribution, Value vs Momentum scatter plot, and Risk vs Rarity analysis for portfolio insights*

### Domain Detail Page
![Domain Detail](./public/screenshots/domain-detail.png)
*AI Investment Analysis with Risk/Rarity/Momentum/Forecast scores, value trend charts, and activity timeline*

## Demo

**Live Demo**: Deployed on Vercel, connected to Doma testnet (chain ID 97476)

**Explorer Integration**: All domains and transactions link directly to Doma Explorer at `https://explorer-testnet.doma.xyz/token/{address}?tokenId={id}`

## Hackathon Context

**Doma Protocol Hackathon - Track 4: Trait Scoring & Analytics**
Challenge: Build AI-driven tools to score domain traits/rarity using on-chain data, capturing trends to inform trades and unlock DeFi integrations.

Dometrics addresses this by providing transparent, explainable analytics that help traders identify value, manage risk, and spot momentum before the market. The system is production-ready for integration with domain-collateralized lending protocols and automated trading strategies.

## How Dometrics Supports DeFi

Dometrics' transparent scoring infrastructure enables domain-backed financial primitives previously impossible without standardized risk assessment. The on-chain verifiable scores create composable building blocks for DeFi protocols.

### Domain-Collateralized Lending

Risk scores (0-100) provide loan-to-value ratios for lending pools. A domain with Risk Score 15 and verified $5,000 market value could collateralize $3,750 USDC (75% LTV). Lenders set maximum risk thresholds—pools accepting Risk <30 offer 4% APY, while Risk 30-60 pools demand 8% APY. Liquidation triggers automatically when Risk Score crosses 70 or expiry drops below 60 days, protecting lender capital.

**Technical Integration**: Protocols read `getDomainScores(tokenId)` from Dometrics contract oracle (future deployment) or fetch client-side via same GraphQL queries. Real-time score updates via Subgraph subscriptions enable instant liquidation detection.

### Domain-Backed Insurance Protocols

Rarity and Momentum scores determine insurance premiums for domain ownership protection. High-rarity domains (Score >80) with stable momentum (40-60) qualify for theft/transfer insurance at 2% annual premium of assessed value. Coverage pays out if unauthorized transfer occurs or if domain value drops >30% due to TLD deprecation events.

**Actuarial Model**: Premium calculations use `rarity_score * 0.015 + (50 - momentum_score) * 0.0003` to price volatility risk. Claims validated against historical `TokenPurchasedActivity` data to verify legitimate value loss.

### Structured Products & Domain Baskets

Forecast scores enable index products tracking domain vertical performance. A ".ai Domain Growth Fund" holds 20 domains with Forecast >+15% and Momentum >70, rebalancing monthly based on score changes. Investors gain diversified exposure to trending TLD sectors without managing individual renewals.

**Basket Construction**:
- **Blue-Chip Basket**: Risk <20, Rarity >60, established TLDs (.com, .org) → Stable 8-12% projected returns
- **High-Growth Basket**: Momentum >75, Forecast >+20%, emerging TLDs (.ai, .xyz) → Volatile 25-40% projected returns
- **Value Basket**: Rarity >70, current offers <forecasted value → Arbitrage opportunities 15-30% upside

Smart contracts track basket composition via `BasketManager.rebalance()` calling Dometrics API to fetch latest scores. Shares are ERC-20 tokens representing proportional ownership of underlying domains.

### TLD Vertical Benchmarks

Aggregate scoring data creates performance benchmarks for domain verticals. The ".ai Performance Index" averages Risk/Rarity/Momentum across all .ai domains, updated hourly. Derivatives markets can trade ".ai vs .com momentum spread" or bet on ".xyz rarity index reaching >65 by Q2".

**Index Calculation**:
```
TLD_Index = (avg_rarity * 0.4) + (avg_momentum * 0.35) + ((100 - avg_risk) * 0.25)
```

Benchmark scores enable:
- **Comparative Analysis**: Is this .ai domain undervalued vs sector average?
- **Trend Detection**: .xyz momentum index jumped 23 points in 7 days—investigate catalyst
- **Risk Management**: Portfolio overexposed to high-risk TLDs (avg Risk >60)

### On-Chain Oracle Integration

Future deployment includes a Chainlink-compatible oracle publishing score updates every 6 hours. DeFi protocols consume `DometricsOracle.getLatestScore(tokenId)` for trustless integration. Dispute mechanism allows domain owners to challenge scores with on-chain evidence (recent high offers, renewal proof), triggering manual review.

**Oracle Data Feed**:
- Gas-optimized batch updates for 100+ domains per transaction
- Fallback to client-side verification if oracle unavailable
- Score history stored on-chain for 90 days enables time-based derivatives

All financial primitives inherit Dometrics' explainability—users understand exactly why a domain qualifies for 75% LTV or 2% insurance premium. Transparent scoring prevents algorithmic blackbox risk common in traditional DeFi collateral systems.

## Known Limitations (Testnet)

- `offers(tokenId: ...)` parameter not supported; must fetch all and filter client-side
- `tokenActivities` returns 400 for some tokens; graceful fallback to empty array
- No active offer data in testnet; `nameStatistics.highestOffer` consistently null
- Forecast model uses heuristics rather than ML due to limited historical data

All limitations handled with appropriate fallbacks. Production deployment on mainnet would leverage full orderbook and historical activity data.

## License

MIT
