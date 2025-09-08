'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, TrendingUp, Clock, Shield, ChevronRight, Info } from 'lucide-react'
import { ScoringEngine } from '@/lib/scoring'
import DomainCard from '@/components/domain/domain-card'

const scoringEngine = new ScoringEngine()

// Mock data - replace with actual Doma Subgraph query
const mockDomains = [
  {
    id: '1',
    name: 'premium.com',
    expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    lockStatus: false,
    registrarId: 1,
    renewalCount: 2,
    offerCount: 3,
    activity7d: 5,
    activity30d: 3,
    price: 5000,
  },
  {
    id: '2',
    name: 'crypto.xyz',
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    lockStatus: true,
    registrarId: 2,
    renewalCount: 1,
    offerCount: 5,
    activity7d: 8,
    activity30d: 4,
    price: 2500,
  },
  {
    id: '3',
    name: 'defi.com',
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    lockStatus: false,
    registrarId: 3,
    renewalCount: 3,
    offerCount: 2,
    activity7d: 2,
    activity30d: 6,
    price: 10000,
  },
  {
    id: '4',
    name: 'web3.io',
    expiresAt: new Date(Date.now() + 200 * 24 * 60 * 60 * 1000),
    lockStatus: false,
    registrarId: 1,
    renewalCount: 4,
    offerCount: 8,
    activity7d: 12,
    activity30d: 5,
    price: 7500,
  },
]

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredDomains, setFilteredDomains] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    // Initial load - show trending domains
    const scoredDomains = mockDomains.map(domain => ({
      ...domain,
      scores: scoringEngine.calculateScores({
        name: domain.name.split('.')[0],
        tld: domain.name.split('.')[1],
        expiresAt: domain.expiresAt,
        lockStatus: domain.lockStatus,
        registrarId: domain.registrarId,
        renewalCount: domain.renewalCount,
        offerCount: domain.offerCount,
        activity7d: domain.activity7d,
        activity30d: domain.activity30d,
      }),
    }))
    setFilteredDomains(scoredDomains)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSearching(true)
    
    // Simulate search delay
    setTimeout(() => {
      if (searchQuery.trim()) {
        const results = mockDomains.filter(domain =>
          domain.name.toLowerCase().includes(searchQuery.toLowerCase())
        ).map(domain => ({
          ...domain,
          scores: scoringEngine.calculateScores({
            name: domain.name.split('.')[0],
            tld: domain.name.split('.')[1],
            expiresAt: domain.expiresAt,
            lockStatus: domain.lockStatus,
            registrarId: domain.registrarId,
            renewalCount: domain.renewalCount,
            offerCount: domain.offerCount,
            activity7d: domain.activity7d,
            activity30d: domain.activity30d,
          }),
        }))
        setFilteredDomains(results)
      } else {
        // Reset to all domains
        const scoredDomains = mockDomains.map(domain => ({
          ...domain,
          scores: scoringEngine.calculateScores({
            name: domain.name.split('.')[0],
            tld: domain.name.split('.')[1],
            expiresAt: domain.expiresAt,
            lockStatus: domain.lockStatus,
            registrarId: domain.registrarId,
            renewalCount: domain.renewalCount,
            offerCount: domain.offerCount,
            activity7d: domain.activity7d,
            activity30d: domain.activity30d,
          }),
        }))
        setFilteredDomains(scoredDomains)
      }
      setIsSearching(false)
    }, 300)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-gray-900 dark:text-white">
                Dometrics
              </Link>
            </div>
            <nav className="flex items-center gap-6">
              <Link href="/analytics" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 text-sm font-medium transition-colors">
                Analytics
              </Link>
              <Link href="/alerts" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 text-sm font-medium transition-colors">
                Alerts
              </Link>
              <Link href="/api-docs" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 text-sm font-medium transition-colors">
                API
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero with Search */}
      <section className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Domain Analytics
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Search and analyze tokenized domains
            </p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search domains (e.g., crypto.xyz, defi.com)"
              className="w-full px-6 py-4 pr-12 text-lg border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50"
            >
              <Search className="w-5 h-5" />
            </button>
          </form>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4 mt-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">1,250</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Total Domains</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">$2.5M</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Total Volume</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">89%</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">24/7</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Monitoring</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {searchQuery ? `Results for "${searchQuery}"` : `Recent Domains`}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {filteredDomains.length} {filteredDomains.length === 1 ? 'domain' : 'domains'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Risk
            </button>
            <button className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Rarity
            </button>
            <button className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Momentum
            </button>
            <button className="px-3 py-1.5 text-sm bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">
              All Scores
            </button>
          </div>
        </div>

        {/* Results Grid */}
        {isSearching ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500 dark:text-gray-400">Searching...</div>
          </div>
        ) : filteredDomains.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDomains.map((domain) => (
              <Link key={domain.id} href={`/domain/${domain.id}`}>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:border-gray-300 dark:hover:border-gray-700 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {domain.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                        ${domain.price.toLocaleString()}
                      </p>
                    </div>
                    {domain.lockStatus && (
                      <Shield className="w-4 h-4 text-gray-400" />
                    )}
                  </div>

                  {/* Score Pills */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        Risk {domain.scores.risk}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        Rarity {domain.scores.rarity}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        Mom. {domain.scores.momentum}
                      </span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>
                        {Math.floor((domain.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))}d
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <TrendingUp className="w-3 h-3" />
                      <span>{domain.activity7d} activities</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No domains found matching your search' : 'No domains available'}
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-12 bg-gray-100 dark:bg-gray-800 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                How Scoring Works
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Domains are scored on four metrics:
                <strong> Risk</strong> (expiry timeline, lock status),
                <strong> Rarity</strong> (name length, TLD),
                <strong> Momentum</strong> (recent activity), and
                <strong> Forecast</strong> (predicted value).
                Scores range from 0-100.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}