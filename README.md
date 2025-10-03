# 🏠 Dometrics

> _Doma means home, and Dometrics is the home of your domain metrics._  
> **Do metrics, Dometrics.**

## Startup Vision

**We're building Dometrics to become the Bloomberg Terminal for tokenized domains.** This hackathon project is our MVP and proof of concept, but our vision extends far beyond. Post-hackathon, we plan to:

- **Launch as a SaaS platform** with premium analytics and API access
- **Integrate ML models** for advanced price prediction and portfolio optimization
- **Build institutional-grade tools** for domain funds and large holders
- **Create the industry standard** for domain valuation and risk assessment
- **Partner with DeFi protocols** to enable domain-backed lending at scale

Doma means home, support us in becoming the insights layer in how the world values and trades digital real estate.

---

The global domain market is worth over $10 billion annually, yet it remains opaque, under-analyzed, and under-leveraged as an asset class.
Domains are traded daily, but investors lack transparent risk, rarity, and momentum insights — the very tools that drive liquidity and confidence in other markets.

We want to bring clarity and trust into digital real estate.

By providing AI-driven scoring and analytics directly on top of Doma Protocol, we give domain investors the visibility they need to trade smarter today — while laying the foundation for a new era of DomainFi, where tokenized domains power lending, structured products, and institutional-grade portfolios can be built on.

So, what was shipped in the hack? AI-driven domain scoring and analytics for Doma Protocol tokenized domains. A client-heavy, thin-backend web app that scores domains on **Risk**, **Rarity**, **Momentum**, and **Forecast** using real-time on-chain data.

## ✨ Features

### 🎯 Core Analytics

- **Risk Scoring**: Expiry buffer, lock status, registrar quality analysis
- **Rarity Assessment**: Name length, dictionary words, TLD scarcity scoring
- **Momentum Tracking**: 7d vs 30d activity deltas and trend analysis
- **Value Forecasting**: 6-month predictions with confidence intervals

### 📊 Smart Dashboard

- **Portfolio Explorer**: Browse tokenized domains with advanced filters
- **TLD Cohort Analysis**: Track trends across .com, .xyz, and emerging TLDs
- **Top Movers**: Identify domains with significant momentum shifts
- **Real-time Alerts**: Browser notifications for critical domain events

### 🔗 Seamless Integration

- **Direct Subgraph Integration**: Real-time data from Doma's multi-chain API
- **Smart Contract Optimization**: Batched reads via viem multicall
- **Explorer Deep Links**: One-click navigation to Doma Explorer and orderbook
- **Mobile-First Design**: Responsive UI with smooth animations

## 🏗️ Architecture

### Client-Heavy Design

- **Frontend**: Next.js 14 + React 18 + TypeScript + Framer Motion
- **Scoring Engine**: Client-side computation with explainable AI weights
- **Caching**: IndexedDB + localStorage for instant performance
- **Charts**: Beautiful data visualization with Recharts

### Backend

- **KV Cache**: Upstash Redis for hot query caching (5-15 min TTL)
- **Serverless Cron**: Periodic cohort precomputation via Vercel
- **No Database**: Everything computed client-side or cached in KV
- **Minimal API**: 2 serverless routes for optimization

## 🎨 Modern UI/UX

### Design System

- **Ultra-smooth animations** with Framer Motion
- **Glassmorphism effects** and modern card layouts
- **Radix UI primitives** for accessibility and consistency
- **Tailwind CSS** with custom domain-focused theme
- **Lucide icons** for crisp, consistent iconography

### Color Palette

- **Primary**: Deep ocean blue gradient (#1e40af → #3b82f6)
- **Success**: Emerald green (#10b981)
- **Warning**: Amber gold (#f59e0b)
- **Danger**: Rose red (#ef4444)
- **Neutral**: Sophisticated grays with perfect contrast

### Typography

- **Inter font family** with variable weights
- **Tabular numerals** for financial data
- **Perfect contrast ratios** (WCAG AA compliant)

## 📈 Scoring Methodology

All scores range **0–100** with transparent, explainable weights:

### Risk Score (Higher = Riskier)

- **45%** Expiry buffer (≥180d → 0 risk; ≤30d → 100 risk)
- **25%** Lock status (locked domains carry higher risk)
- **15%** Registrar quality (trusted vs unknown registrars)
- **10%** Renewal history (frequent renewals reduce risk)
- **5%** Market liquidity (active offer/bid activity)

### Rarity Score (Higher = Rarer)

- **40%** Name length (shorter = rarer)
- **25%** Dictionary/brandable detection
- **25%** TLD scarcity analysis
- **10%** Historic demand patterns

### Momentum Score (Higher = Hotter)

- **70%** 7d vs 30d activity delta
- **30%** Recent transfer/listing events (72h window)

### Forecast Value (6-Month Prediction)

Given our teams past experience working on predictive analytics platforms like SAP, we've integrated real and production grade forcasting. In the future we plan to enhance it further with prescriptive analytics as well as allowing users to simulate whatif scenarios with their baskets of potential domains. We also plan to create index price baskets of different verticals of domains which you can see the foundations of on the /analytics page such as growth of specific domain types (i.e. .io vs .com vs .ai vs .xyz) as well as keywords.

```javascript
forecast = base * (1 + 0.5*momentum + 0.3*rarity - 0.4*risk)
confidence_interval = ±(10% + risk*10%)
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
git clone https://github.com/your-username/dometrics
cd dometrics/web
npm install
```

### Environment Setup

```bash
cp .env.example .env.local
# Add your Doma API key if you have one (optional for basic functionality)
```

### Development

```bash
npm run dev        # Start development server with Turbopack
npm run build      # Build for production
npm run lint       # Run ESLint
npm run typecheck  # TypeScript checking
```

## 🌐 Doma Integration

### Subgraph Queries

- **Portfolio Discovery**: `names` query with owner filters
- **Activity Analysis**: `tokenActivities` for momentum calculation
- **Market Data**: `listings` and `offers` for liquidity scoring
- **Statistics**: `nameStatistics` for aggregated insights

### Smart Contract Integration

- **Risk Assessment**: Direct `expirationOf` reads for accurate expiry data
- **Batch Optimization**: Multicall for efficient contract interactions
- **Real-time Sync**: Latest on-chain state via Subgraph indexing

### Deep Linking

- **Explorer Integration**: Direct links to token pages and transactions
- **Orderbook Ready**: Prepared for future write operations
- **Multi-chain Support**: Works across Doma's chain deployments


## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Cd into /web and run npm install & npm run dev
4. Make your changes with proper TypeScript types
5. Add tests if applicable
6. Run linting and type checking
7. Submit a Pull Request

## 📄 License

This project is licensed under the MIT License - see [LICENSE](./LICENSE) file for details.



---

<div align="center">

**Built with ❤️ **

_Doma means home, and Dometrics is the home of your domain metrics._

[🔗 Live Demo](https://dometrics.vercel.app) • [📚 Documentation](./docs) • [🎥 Video Walkthrough](./docs/demo.md)

</div>
