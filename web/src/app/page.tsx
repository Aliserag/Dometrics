'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, Filter, TrendingUp, Shield, Sparkles, Activity, Home } from 'lucide-react'
import { DomainCard } from '@/components/domain/domain-card'
import { scoringEngine } from '@/lib/scoring'
import Link from 'next/link'

// Mock data for demonstration
const MOCK_DOMAINS = [
  {
    id: '1',
    name: 'crypto',
    tld: 'eth',
    tokenId: '123456789',
    tokenAddress: '0x1234567890123456789012345678901234567890',
    ownerAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
    expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
    lockStatus: false,
    renewalCount: 3,
    offerCount: 5,
    activity7d: 12,
    activity30d: 28,
  },
  {
    id: '2',
    name: 'defi',
    tld: 'xyz',
    tokenId: '987654321',
    tokenAddress: '0x1234567890123456789012345678901234567890',
    ownerAddress: '0xfedcba0987654321fedcba0987654321fedcba09',
    expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    lockStatus: true,
    renewalCount: 1,
    offerCount: 2,
    activity7d: 5,
    activity30d: 8,
  },
  {
    id: '3',
    name: 'web3',
    tld: 'com',
    tokenId: '555555555',
    tokenAddress: '0x1234567890123456789012345678901234567890',
    ownerAddress: '0x1111222233334444555566667777888899990000',
    expiresAt: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000).toISOString(),
    lockStatus: false,
    renewalCount: 5,
    offerCount: 8,
    activity7d: 20,
    activity30d: 35,
  },
]

export default function HomePage() {
  const [domains, setDomains] = useState<typeof MOCK_DOMAINS>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'low-risk' | 'high-growth' | 'rare'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading domains
    setTimeout(() => {
      setDomains(MOCK_DOMAINS)
      setLoading(false)
    }, 1000)
  }, [])

  const scoredDomains = domains.map(domain => ({
    ...domain,
    scores: scoringEngine.calculateScores(domain)
  }))

  const filteredDomains = scoredDomains.filter(domain => {
    const matchesSearch = 
      domain.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      domain.tld.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (!matchesSearch) return false

    switch (filterType) {
      case 'low-risk':
        return domain.scores.risk < 30
      case 'high-growth':
        return domain.scores.forecast > 70
      case 'rare':
        return domain.scores.rarity > 70
      default:
        return true
    }
  })

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
                className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center"
              >
                <Home className="w-6 h-6 text-white" />
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Dometrics
                </h1>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Do metrics, Dometrics.
                </p>
              </div>
            </Link>

            <nav className="flex items-center gap-6">
              <Link href="/dashboard" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Dashboard
              </Link>
              <Link href="/alerts" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Alerts
              </Link>
              <Link href="/trends" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Trends
              </Link>
              <w3m-button />
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Domain Intelligence
              </span>
              <br />
              <span className="text-gray-900 dark:text-white">
                at Your Fingertips
              </span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-8">
              AI-driven scoring and analytics for Doma Protocol tokenized domains. 
              Make informed decisions with transparent risk, rarity, momentum, and forecast metrics.
            </p>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-12">
            <StatCard
              icon={<Shield className="w-6 h-6" />}
              label="Risk Analysis"
              value="Real-time"
              color="from-green-500 to-emerald-600"
            />
            <StatCard
              icon={<Sparkles className="w-6 h-6" />}
              label="Rarity Scoring"
              value="AI-Driven"
              color="from-purple-500 to-pink-600"
            />
            <StatCard
              icon={<TrendingUp className="w-6 h-6" />}
              label="Momentum Tracking"
              value="7d/30d"
              color="from-blue-500 to-cyan-600"
            />
            <StatCard
              icon={<Activity className="w-6 h-6" />}
              label="Value Forecast"
              value="6 Months"
              color="from-orange-500 to-red-600"
            />
          </div>
        </div>
      </section>

      {/* Search and Filters */}
      <section className="px-4 sm:px-6 lg:px-8 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search domains..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'low-risk', 'high-growth', 'rare'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-6 py-3 rounded-xl font-medium transition-all ${
                    filterType === type
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:shadow-md'
                  }`}
                >
                  {type === 'all' ? 'All Domains' :
                   type === 'low-risk' ? 'Low Risk' :
                   type === 'high-growth' ? 'High Growth' :
                   'Rare'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Domain Grid */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-2xl h-64" />
                </div>
              ))}
            </div>
          ) : filteredDomains.length > 0 ? (
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {filteredDomains.map((domain) => (
                <DomainCard
                  key={domain.id}
                  domain={domain}
                  scores={domain.scores}
                  onSelect={() => window.location.href = `/domain/${domain.id}`}
                />
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-20">
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                No domains found matching your criteria
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode
  label: string
  value: string
  color: string
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all"
    >
      <div className={`w-12 h-12 bg-gradient-to-r ${color} rounded-xl flex items-center justify-center text-white mb-4 mx-auto`}>
        {icon}
      </div>
      <h3 className="text-gray-600 dark:text-gray-400 text-sm mb-1">{label}</h3>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    </motion.div>
  )
}