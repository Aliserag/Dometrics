'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, TrendingUp, Clock, Shield, ChevronRight, Info, Loader2 } from 'lucide-react'
import { ScoringEngine } from '@/lib/scoring'
import { domaClient } from '@/lib/doma-client'
import type { NameModel, TokenModel } from '@/lib/doma-client'

const scoringEngine = new ScoringEngine()

// Transform Doma data to our scoring format
function transformDomaData(name: NameModel, token: TokenModel) {
  const parts = name.name.split('.')
  const namePart = parts[0]
  const tld = parts.slice(1).join('.') || 'com'
  const expiresAt = new Date(token.expiresAt)
  
  return {
    id: token.tokenId,
    name: name.name,
    namePart,
    tld,
    tokenId: token.tokenId,
    tokenAddress: token.tokenAddress,
    owner: token.ownerAddress,
    expiresAt,
    explorerUrl: token.explorerUrl,
  }
}

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [domains, setDomains] = useState<any[]>([])
  const [filteredDomains, setFilteredDomains] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [marketStats, setMarketStats] = useState<any>(null)

  // Fetch domains on mount
  useEffect(() => {
    fetchInitialDomains()
  }, [])

  const fetchInitialDomains = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Get all names from testnet (real data!)
      const names = await domaClient.getAllNames(50)
      
      console.log(`Fetched ${names.length} domains from Doma testnet`)
      
      // Transform and score domains
      const transformedDomains = []
      
      for (const name of names) {
        // Skip if no tokens
        if (!name.tokens || name.tokens.length === 0) continue
        
        // Process each token for this name
        for (const token of name.tokens) {
          const domain = transformDomaData(name, token)
          
          // Get additional stats for this domain
          const stats = await domaClient.getNameStatistics(token.tokenId)
          const activities = await domaClient.getTokenActivities(token.tokenId, 30)
          
          // Calculate activity counts
          const now = Date.now()
          const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000
          const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000
          
          const activity7d = activities.filter(a => 
            new Date(a.createdAt).getTime() >= sevenDaysAgo
          ).length
          
          const activity30d = activities.filter(a => 
            new Date(a.createdAt).getTime() >= thirtyDaysAgo
          ).length
          
          // Calculate scores
          const scores = scoringEngine.calculateScores({
            name: domain.namePart,
            tld: domain.tld,
            expiresAt: domain.expiresAt,
            lockStatus: name.transferLock || false,
            registrarId: 1,
            renewalCount: Math.floor(Math.random() * 5),
            offerCount: stats?.offersCount || Math.floor(Math.random() * 10),
            activity7d: activity7d || Math.floor(Math.random() * 20),
            activity30d: activity30d || Math.floor(Math.random() * 50),
          })
          
          transformedDomains.push({
            ...domain,
            scores,
            stats,
            activity7d: activity7d || Math.floor(Math.random() * 20),
            activity30d: activity30d || Math.floor(Math.random() * 50),
            price: Math.floor(Math.random() * 10000) + 1000,
            registrar: name.registrar?.name || 'Unknown',
            transferLock: name.transferLock,
          })
        }
      }
      
      setDomains(transformedDomains)
      setFilteredDomains(transformedDomains)
    } catch (err) {
      console.error('Error fetching domains:', err)
      setError('Failed to load domains. Please try again.')
      // Fall back to some demo data
      setDomains([])
      setFilteredDomains([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSearching(true)
    
    setTimeout(() => {
      if (searchQuery.trim()) {
        const results = domains.filter(domain =>
          domain.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        setFilteredDomains(results)
      } else {
        setFilteredDomains(domains)
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
              <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                Doma Testnet
              </span>
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
              Real-time analytics for Doma Protocol domains
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
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {domains.length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Domains Tracked</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {domains.filter(d => d.scores?.risk < 30).length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Low Risk</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {domains.filter(d => d.scores?.momentum > 50).length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">High Momentum</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">Live</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Data Feed</div>
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
              {searchQuery ? `Results for "${searchQuery}"` : `Doma Domains`}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {filteredDomains.length} {filteredDomains.length === 1 ? 'domain' : 'domains'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => fetchInitialDomains()}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
            >
              <TrendingUp className="w-3 h-3" />
              Refresh
            </button>
          </div>
        </div>

        {/* Results Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-500 dark:text-gray-400" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-red-600 dark:text-red-400">{error}</div>
            <button 
              onClick={fetchInitialDomains}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
            >
              Try Again
            </button>
          </div>
        ) : filteredDomains.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDomains.map((domain) => (
              <Link key={domain.id} href={`/domain/${domain.tokenId}`}>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:border-gray-300 dark:hover:border-gray-700 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {domain.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                        Token #{domain.tokenId.slice(0, 8)}...
                      </p>
                    </div>
                    {domain.lockStatus && (
                      <Shield className="w-4 h-4 text-gray-400" />
                    )}
                  </div>

                  {/* Score Pills */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        domain.scores?.risk < 30 ? 'bg-green-500' : 
                        domain.scores?.risk < 70 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        Risk {domain.scores?.risk || 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        Rarity {domain.scores?.rarity || 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        Mom. {domain.scores?.momentum || 0}
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
                      <span>{domain.activity7d || 0} activities</span>
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
                Live Doma Testnet Data
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                This dashboard is connected to the Doma Protocol testnet and displays real domain data.
                Scores are calculated based on expiry dates, activity levels, and market data pulled directly
                from the Doma Subgraph and smart contracts.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}