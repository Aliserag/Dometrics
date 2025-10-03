# Dometrics — AI-Driven Domain Scoring & Analytics

## Project Overview

**Dometrics** is a client-heavy, thin-backend web app that scores tokenized domains on **Risk**, **Rarity**, **Momentum**, and **Forecast** using Doma Subgraph + Ownership reads. No heavy DBs, no queues. Optional cron + a single KV store to cache results. Demo-ready in days.

### TL;DR Architecture
A **client-heavy, thin-backend** web app that scores tokenized domains on Risk / Rarity / Momentum / Forecast using Doma Subgraph + Ownership reads. No heavy DBs, no queues. Optional cron + a single KV store to cache results. You can demo in days.

---

## Hackathon Context

### Doma Protocol Hackathon - Track 4: Trait Scoring & Analytics
**Prize**: $10,000 USDC + Doma Forge fast-track eligibility  
**Challenge**: Build AI-driven tools to score domain traits/rarity using on-chain data, capturing trends to inform trades and unlock valuable opportunities for increased volume and DeFi integrations.

### Key Dates & Timeline
- **Hacker Pre-Registration Opens**: Aug 9, 2025
- **BUIDL Submissions Open**: Aug 16, 2025  
- **Submission Deadline**: Sept 12, 2025
- **Winners Announced**: Oct 3, 2025

### Judging Criteria
- 40% Innovation
- 30% Doma Integration & onchain impact
- 20% Usability
- 10% Demo Quality

### Prize Pool
- **$50,000 USDC total** ($10,000 per track winner)
- All qualified submissions eligible for **Doma Forge grants** ($1M USDC pool)
- **Ambassador Bonus Challenges**: $5,000 additional bounty pool

---

## Scope (What It Does)

### Core Features
1. **Portfolio & Explorer**: Browse tokenized domains with filters (TLD, length, expiry)
2. **Scores v1**: Risk, Rarity, Momentum, Forecast(6m) using simple, explainable weights
3. **Trends**: TLD cohort stats (7/30/90d) and "Top Movers"
4. **Light Alerts**: In-app and browser push for critical conditions (expiry soon, risk ↑)
5. **One-Click Deep Links**: To Doma explorer / orderbook (read-only for MVP)

### Target Users
- **Domain Traders**: Find undervalued domains and optimal exit timing
- **Risk Managers**: Identify high-risk domains before renewal deadlines
- **Market Analysts**: Track TLD trends and momentum patterns
- **DeFi Users**: Assess domain collateral quality for lending protocols

---

## Architecture (Simple & Sturdy)

### Frontend (Next.js + React + TS)
- **Direct Integration**: Fetches Doma Subgraph directly (GraphQL)
- **Smart Contract Reads**: Batched Ownership reads via viem's multicall (`expirationOf`, `lockStatusOf`)
- **Client-Side Scoring**: Computes scores in browser from fetched data
- **Local Caching**: API responses + computed scores in IndexedDB/localStorage for snappy UX
- **Push Notifications**: Browser push for expiry/risk alerts locally (with permission)

### "Thin" Backend (Optional, 1–2 serverless routes)
- **`/api/cache`** (KV/Upstash): Cache hot GraphQL queries for 5–15 min to speed up lists
- **`/api/cron/recompute`** (daily/hourly Vercel Cron): Precompute popular cohorts (e.g., .com, .xyz) and store to KV so first paint is instant
- **No relational DB. No queues. No workers.** Just KV + cron.

### Keys/Secrets
- **None required** for reads (Subgraph + chain RPC)
- If email alerts added later, keep API key server-side only

---

## Data Sources

### Doma Multi-Chain Subgraph (GraphQL)
- **Endpoint**: `https://api-testnet.doma.xyz/graphql`
- **Queries**: `names`, `token/name activities`, `listings/offers` (for momentum)
- **Use Cases**: Portfolio discovery, activity history, market data

### Ownership Token (EVM)
- **Key Function**: `expirationOf(tokenId)` (primary risk input)
- **Optional**: `lockStatusOf(tokenId)` if easily accessible
- **Integration**: Batched multicall via viem for performance

### Explorer Integration
- **Deep Links**: Each token & transaction links to Doma Explorer
- **Format**: `https://explorer-testnet.doma.xyz/token/{address}?tokenId={id}`

---

## Scoring System v1 (Simple + Explainable)

All scores **0–100**. Weights stored in `/config/weights.v1.json` for easy tweaking without redeploy.

### 1. Risk Score (Higher = Riskier)
- **Expiry Buffer** (days to expiration): **45%**
  - ≥180d → 0 risk; ≤30d → 100 risk (linear clamp)
- **Lock Status** (if available): **25%** 
  - locked → +25, unlocked → +0
- **Registrar Quality** (if exposed): **15%**
  - trusted bucket → 0, unknown → +15
- **Renewal History** (count in 365d): **10%**
  - ≥2 renewals → −10, else 0
- **Liquidity** (offers in 30d): **5%**
  - ≥3 offers → −5

### 2. Rarity Score (Higher = Rarer)
- **Name Length**: **40%** (≤4 chars → 100; ≥12 → 0)
- **Dictionary/Brandable** (simple wordlist/regex): **25%**
- **TLD Scarcity Bucket**: **25%**
- **Historic Demand** (unique wallets offering in 90d): **10%**

### 3. Momentum Score (Higher = Hotter)
- **Offers/Listings 7d vs 30d Delta**: **70%**
- **Recent Transfer/List Event** (past 72h): **30%**

### 4. Forecast (6 Month Prediction)
- **Simple Linear Blend**:
  ```
  forecast = base * (1 + 0.5*momentum_norm + 0.3*rarity_norm - 0.4*risk_norm)
  ```
- **Confidence Interval**: Show 80% CI by ±(10% + risk_norm*10%)
- **Explainability**: Tooltip explains top 3 drivers (expiry, momentum delta, length)
- **Normalization**: All scores scaled 0–1 for blending

---

## User Interface (Focused & Clean)

### Dashboard
- **Filters**: TLD, length, risk band, growth filters
- **Tabs**: Low-Risk, High-Growth, Rare, Hot domains
- **Sorting**: By any score with clear indicators

### Domain Detail Page
- **4 Scores Display**: Risk, Rarity, Momentum, Forecast with explainers
- **Sparkline Charts**: 7/30d activity trends
- **Expiry Meter**: Visual countdown to expiration
- **Activity Feed**: Recent transactions and events
- **Forecast Chart**: Line with confidence interval band
- **"Why This Score"**: Expandable chips showing top factors

### Alerts (Lite Implementation)
- **Toggle Switches**:
  - "Notify if expires < 30 days"
  - "Notify if risk > 70"  
  - "Notify if forecast growth > 15%"
- **In-App Notifications**: Simple notification center
- **Browser Push**: With user permission for critical alerts

### Actions
- **Deep Links**: To Doma explorer and orderbook pages
- **No Writes**: Read-only MVP (no orderbook transactions)
- **Export**: CSV download of current filtered results

---

## Technical Implementation

### Frontend Stack
- **Framework**: Next.js 14 + React 18 + TypeScript
- **Styling**: Tailwind CSS with custom domain-focused theme
- **Data Fetching**: TanStack Query + GraphQL client
- **Blockchain**: Viem for contract reads, multicall batching
- **Caching**: IndexedDB for persistence, React Query for memory
- **Charts**: Lightweight charting library (recharts or similar)

### Backend (Minimal)
- **Hosting**: Vercel serverless functions
- **Cache**: Upstash Redis/KV for hot query caching
- **Cron**: Vercel Cron for periodic cohort precomputing
- **No Database**: Everything computed client-side or cached in KV

### Performance Optimizations
- **Batch Contract Calls**: Multicall for efficiency
- **Smart Caching**: 5-15min cache for popular queries
- **Client Computing**: Scores calculated in browser for responsiveness
- **Progressive Loading**: Skeleton screens and incremental data loading

---

## MoSCoW Requirements (Lite Scope)

### MUST Have
- Subgraph querying + pagination for domain discovery
- Ownership `expirationOf` reads (batched via multicall)
- Compute & display Risk/Rarity/Momentum/Forecast with explainers
- Filters & TLD cohort summaries (7/30/90d activity)
- In-app/local alerts for expiry/risk thresholds
- Explorer deep links for all domains and transactions

### SHOULD Have
- KV cache + hourly/daily cron precompute of cohort stats
- Browser push notifications (with user permission)
- CSV export of current filtered table
- Mobile-responsive design

### COULD Have
- Email alerts (Resend) via one serverless route
- Lock status read & registrar bucketing for enhanced risk scoring
- Settings page to tweak local scoring weights
- Advanced filtering and search capabilities

### WON'T Have (MVP)
- Any writes to orderbook or smart contracts
- Complex backend pipelines, queues, or relational databases
- ML models—keep "AI" to heuristics and linear blending
- User accounts or authentication systems

---

## ✅ IMPLEMENTATION STATUS (Latest: Oct 3, 2025)

### Real Data Integration - COMPLETE
- ✅ **Blockchain Data**: Batch smart contract reads via multicall for `expirationOf`, `lockStatusOf`, `registrarOf`
- ✅ **Market Pricing**: Real domain values from Doma API (highest offers, recent sales, active listings)
- ✅ **GraphQL Queries**: All queries updated to match actual Doma API schema
- ✅ **Performance**: Optimized from 2min load time to ~5-10 seconds

### Price Determination (How It Works)
**Priority-Based Real Market Value:**
1. **Recent Sale Price** (95% confidence) - Actual purchase prices from `TokenPurchasedActivity`
2. **Highest Offer** (85% confidence) - From `nameStatistics.highestOffer` API
3. **Active Offers** (75% confidence) - Max price from `offers` query
4. **Lowest Listing** (65% confidence) - Min asking price from `listings` query
5. **Formula-Based Fallback** (50% confidence) - Calculated from domain characteristics

**Landing Page Optimization:**
- Uses fast `nameStatistics` query for highest offer (1 API call per domain)
- Fallback to calculated value if no market data
- Loads 50 domains in ~5 seconds

**Detail Page Deep Analysis:**
- Fetches complete market history via `getRealMarketValue()`
- Shows recent sales, all offers, and listing prices
- Provides market value source and confidence level

### Working Doma API Queries
```graphql
# Names Query (✅ WORKING)
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

# Name Statistics (✅ WORKING - Returns highest offer)
query NameStatistics($tokenId: String!) {
  nameStatistics(tokenId: $tokenId) {
    name, activeOffers, offersLast3Days
    highestOffer {
      price, offererAddress
      currency { symbol, decimals, usdExchangeRate }
    }
  }
}

# Token Offers (✅ WORKING - Optional tokenId)
query TokenOffers($tokenId: String, $take: Int) {
  offers(tokenId: $tokenId, take: $take) {
    items {
      price, offererAddress
      currency { symbol, usdExchangeRate }
    }
  }
}

# Token Activities (✅ WORKING - Returns purchase history)
query TokenActivities($tokenId: String, $take: Int) {
  tokenActivities(tokenId: $tokenId, take: $take) {
    items {
      ... on TokenPurchasedActivity {
        type, tokenId, name, createdAt
        seller, buyer
        payment { price, currencySymbol }
      }
      # ... other activity types
    }
  }
}
```

### Smart Contract Integration
```typescript
// Multicall batch reads with fallback
const contractData = await domaClient.getTokenRiskData(tokenAddress, tokenIds)
// Returns: { expirationOf: bigint, lockStatusOf: bool, registrarOf: bigint }

// Fallback if multicall3 not deployed
// Falls back to parallel individual readContract() calls
```

### Known API Limitations
- ❌ `listings(tokenId: ...)` - tokenId parameter not supported (fetch all, filter client-side)
- ⚠️ `tokenActivities` - Returns 400 for some tokens (fallback to empty array)
- ✅ All queries handle failures gracefully with appropriate fallbacks

---

## Development Milestones (5–7 Days)

### Day 1: Foundation
- ✅ Next.js app setup with TypeScript + Tailwind
- ✅ GraphQL client configuration for Doma Subgraph
- ✅ Basic domain names list with pagination
- ✅ Token detail route with basic info
- ✅ Viem multicall for `expirationOf` batch reads

### Day 2: Core Scoring
- 🔄 Implement scoring algorithms v1 with explainable weights
- 🔄 Score display components with tooltips
- 🔄 Filters and sorting functionality
- 🔄 IndexedDB caching for API responses

### Day 3: Trends & Analytics
- 🔄 TLD cohort analysis pages
- 🔄 Momentum delta calculations (7d vs 30d)
- 🔄 Sparkline charts for activity trends
- 🔄 "Top Movers" tracking and display

### Day 4: Alerts & Notifications
- 🔄 In-app alert system with toggle switches
- 🔄 Browser push notification setup (with permissions)
- 🔄 Simple notification center UI
- 🔄 Alert condition evaluation logic

### Day 5: Optimization & Caching
- 🔄 KV cache implementation for hot queries
- 🔄 Cron job for cohort precomputation
- 🔄 Loading skeletons and empty states
- 🔄 Performance optimization pass

### Day 6–7: Polish & Demo Prep
- 🔄 CSV export functionality
- 🔄 Accessibility improvements and testing
- 🔄 Demo script and walkthrough preparation
- 🔄 Final bug fixes and UI polish
- 🔄 Optional email alerts implementation

---

## Doma Integration Highlights

### Subgraph Utilization
- **Direct Integration**: No middleware, straight GraphQL queries
- **Comprehensive Data**: Names, activities, market data all from official API
- **Real-time Sync**: Latest on-chain state via Subgraph indexing

### Smart Contract Integration
- **Risk Assessment**: Direct `expirationOf` reads for accurate expiry data
- **Batch Optimization**: Multicall for efficient contract interactions
- **Chain Compatibility**: Works across Doma's multi-chain deployment

### Ecosystem Enhancement
- **Traffic Driver**: Deep links drive users to Doma Explorer and orderbook
- **Market Intelligence**: Scoring helps users make informed domain decisions  
- **DeFi Ready**: Risk scores enable domain-collateralized lending integration
- **Community Tool**: Open-source analytics benefit entire Doma ecosystem

---

## 🚢 Deployment Instructions

### Environment Variables
The following environment variables are configured in `.env.local`:
- `NEXT_PUBLIC_DOMA_API_KEY` - Doma API key (v1.eac1ac49d73f184e1cfd62248fd0c05fdb06b17d97769fc7ee41c706bebd60d5)
- `DOMA_API_KEY` - Same key for server-side
- `BASE_SEPOLIA_PRIVATE_KEY` - Deployment wallet (377e1f23dccc8f2c343e626fcb90f4928a2950c7a2e889c218afe2889f529c5d)
- `NEXT_PUBLIC_WC_PROJECT_ID` - WalletConnect project ID (placeholder: YOUR_PROJECT_ID)

### Vercel Deployment
1. Push code to GitHub
2. Import repository on Vercel
3. Set environment variables in Vercel dashboard:
   - `DOMA_API_KEY` - Your Doma Protocol API key
   - `BASE_SEPOLIA_PRIVATE_KEY` - For contract interactions (if needed)
   - `UPSTASH_REDIS_REST_URL` - Optional for production caching
   - `UPSTASH_REDIS_REST_TOKEN` - Optional for production caching
   - `CRON_SECRET` - Secret for cron job authentication
4. Deploy!

### Manual Deployment
```bash
cd web
npm install
npm run build
npm run start
```

### Vercel Configuration
The `vercel.json` file includes:
- Build and dev commands
- Environment variable mappings
- Cron job for analytics precomputation (every 15 minutes)

---

## Ambassador Bonus Challenges

### Community Engagement
- ✅ Join Doma Discord and share progress in #hackathon
- ✅ Follow @domaprotocol on X and engage with content
- 🔄 Create educational content about domain scoring and analytics

### Technical Contributions
- 🔄 Document Dometrics integration patterns for other developers
- 🔄 Submit improvements to Doma documentation
- 🔄 Host AMA/demo session about domain analytics

### Bug Bounty Participation
- 🔄 Test Doma testnet thoroughly during development
- 🔄 Report any bugs or issues discovered ($500-1,000 bounties available)

---

## Resources & Links

### Doma Protocol
- **Documentation**: https://docs.doma.xyz
- **Testnet**: https://start.doma.xyz/
- **Explorer**: https://explorer-testnet.doma.xyz
- **Subgraph**: https://api-testnet.doma.xyz/graphql

### Community
- **Discord**: https://discord.com/invite/doma
- **X/Twitter**: https://x.com/domaprotocol
- **Blog**: https://blog.doma.xyz/

### Development
- **Forge Program**: https://doma.xyz/forge
- **GitHub**: Doma Protocol repositories
- **Chain ID**: 97476 (Doma Testnet)
- **RPC**: https://rpc-testnet.doma.xyz

---

## Project Structure

```
dometrics/
├── CLAUDE.md                 # This file - project context & roadmap
├── README.md                 # Main project documentation  
├── web/                      # Next.js application
│   ├── src/
│   │   ├── app/             # App router pages
│   │   ├── components/      # UI components
│   │   │   ├── domain/     # Domain-specific components
│   │   │   ├── scoring/    # Score display components
│   │   │   ├── alerts/     # Alert management
│   │   │   └── charts/     # Data visualization
│   │   ├── lib/            # Utilities and integrations
│   │   │   ├── doma-client.ts    # Doma API integration
│   │   │   ├── scoring.ts        # Scoring algorithms
│   │   │   ├── cache.ts          # Client-side caching
│   │   │   └── notifications.ts  # Alert system
│   │   ├── hooks/          # Custom React hooks
│   │   ├── types/          # TypeScript definitions
│   │   └── config/         # Configuration files
│   │       └── weights.v1.json   # Scoring weights
│   ├── public/             # Static assets
│   │   └── config/         # Public configuration
│   └── pages/api/          # Optional serverless functions
│       ├── cache/          # KV cache endpoints
│       └── cron/           # Scheduled functions
└── docs/                   # Additional documentation
    ├── hackathon.md        # Hackathon submission details
    ├── scoring.md          # Detailed scoring documentation
    └── deployment.md       # Deployment instructions
```

---

## Success Metrics & Demo Goals

### Hackathon Judging Criteria Alignment

#### Innovation (40%)
- **Novel Scoring Approach**: Client-side computation with explainable AI
- **Thin Architecture**: Minimal backend, maximum performance
- **Real-time Analytics**: Live domain intelligence without heavy infrastructure

#### Doma Integration (30%)
- **Direct Subgraph Integration**: No middleware, pure GraphQL
- **Smart Contract Optimization**: Efficient multicall patterns
- **Ecosystem Enhancement**: Drives traffic to Doma platforms
- **Multi-chain Ready**: Works across Doma's chain deployments

#### Usability (20%)
- **Intuitive Scoring**: Clear explanations for all analytics
- **Fast Performance**: Client-side caching and computation
- **Mobile Friendly**: Responsive design for all devices
- **One-Click Actions**: Seamless deep linking to Doma services

#### Demo Quality (10%)
- **Live Demonstration**: Working app on Doma testnet
- **Clear Walkthrough**: Step-by-step user journey
- **Technical Deep-dive**: Architecture and integration explanation
- **Business Impact**: How it drives on-chain activity

### Key Demo Points
1. **Portfolio Discovery**: Show how users find and analyze domains
2. **Scoring Explanation**: Demonstrate transparent risk/rarity/momentum analysis
3. **Trend Analysis**: Display TLD cohort insights and market movements
4. **Alert System**: Real-time notifications for critical domain events
5. **Doma Integration**: Seamless links to explorer and marketplace
6. **Performance**: Sub-second loading with client-side optimization

---

## Development Commands

### Web App
```bash
cd web
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run lint         # Run ESLint
npm run typecheck    # TypeScript type checking
```

### Deployment
```bash
npm run deploy       # Deploy to Vercel
npm run build-static # Generate static export if needed
```

### Cache Management
```bash
npm run cache:clear  # Clear KV cache
npm run cache:warm   # Warm popular queries
```

This focused, hackathon-ready approach delivers a powerful domain analytics tool while staying true to the "build in days" philosophy and maximizing our chances in Track 4 competition.