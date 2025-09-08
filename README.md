# 🏠 Dometrics

> _Doma means home, and Dometrics is the home of your domain metrics._  
> **Do metrics, Dometrics.**

AI-driven domain scoring and analytics for Doma Protocol tokenized domains. A client-heavy, thin-backend web app that scores domains on **Risk**, **Rarity**, **Momentum**, and **Forecast** using real-time on-chain data.

## 🚀 Built for Doma Protocol Hackathon - Track 4

**Prize**: $10,000 USDC + Doma Forge fast-track eligibility  
**Challenge**: Build AI-driven tools to score domain traits/rarity using on-chain data

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

### Thin Backend  
- **KV Cache**: Upstash Redis for hot query caching (5-15 min TTL)
- **Serverless Cron**: Periodic cohort precomputation via Vercel
- **No Database**: Everything computed client-side or cached in KV
- **Minimal API**: Only 2 serverless routes for optimization

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

## 🏆 Hackathon Submission

### Innovation (40%)
- ✨ Novel client-side scoring with explainable AI
- 🏗️ Thin architecture for maximum performance  
- ⚡ Real-time analytics without heavy infrastructure

### Doma Integration (30%)
- 🔗 Direct Subgraph integration with zero middleware
- ⛓️ Optimized smart contract interaction patterns
- 🌐 Multi-chain compatibility across Doma ecosystem  
- 📈 Drives traffic to Doma Explorer and orderbook

### Usability (20%)
- 🎨 Intuitive scoring with clear explanations
- ⚡ Sub-second loading with client-side optimization
- 📱 Mobile-first responsive design
- 🔗 One-click actions and seamless navigation

### Demo Quality (10%)
- 🎬 Live working application on Doma testnet
- 📋 Comprehensive walkthrough documentation
- 🔧 Technical architecture explanation
- 💼 Clear business impact demonstration

## 🎯 Roadmap

### Phase 1: Foundation (Days 1-2) ✅
- ✅ Next.js app with modern UI components
- ✅ GraphQL client and Doma Subgraph integration  
- ✅ Basic domain discovery and token detail pages
- ✅ Viem multicall for contract reads

### Phase 2: Core Scoring (Days 3-4) 🔄
- 🔄 Implement all 4 scoring algorithms
- 🔄 Explainable tooltips and factor attribution
- 🔄 Advanced filtering and sorting
- 🔄 Client-side caching with IndexedDB

### Phase 3: Analytics & Trends (Day 5) 🔄  
- 🔄 TLD cohort analysis pages
- 🔄 Momentum calculations and sparkline charts
- 🔄 "Top Movers" identification
- 🔄 Interactive data visualizations

### Phase 4: Alerts & Polish (Days 6-7) 🔄
- 🔄 Browser push notifications  
- 🔄 KV cache and cron optimization
- 🔄 Accessibility improvements
- 🔄 Demo preparation and documentation

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with proper TypeScript types
4. Add tests if applicable  
5. Run linting and type checking
6. Submit a Pull Request

## 📄 License

This project is licensed under the MIT License - see [LICENSE](./LICENSE) file for details.

## 🔗 Links

### Doma Protocol
- **Website**: [doma.xyz](https://doma.xyz)
- **Documentation**: [docs.doma.xyz](https://docs.doma.xyz)  
- **Testnet**: [start.doma.xyz](https://start.doma.xyz/)
- **Explorer**: [explorer-testnet.doma.xyz](https://explorer-testnet.doma.xyz)

### Community  
- **Discord**: [discord.com/invite/doma](https://discord.com/invite/doma)
- **X/Twitter**: [@domaprotocol](https://x.com/domaprotocol)
- **Blog**: [blog.doma.xyz](https://blog.doma.xyz/)

### Hackathon
- **Doma Forge Program**: [doma.xyz/forge](https://doma.xyz/forge)
- **Track 4 Details**: Trait Scoring & Analytics Challenge

---

<div align="center">

**Built with ❤️ for the Doma Protocol Hackathon**

*Doma means home, and Dometrics is the home of your domain metrics.*

[🔗 Live Demo](https://dometrics.vercel.app) • [📚 Documentation](./docs) • [🎥 Video Walkthrough](./docs/demo.md)

</div>