'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, ExternalLink, Clock, Lock, RefreshCw, TrendingUp, Shield, Sparkles, Activity } from 'lucide-react'
import Link from 'next/link'
import { ScoreDisplay } from '@/components/domain/score-display'
import { scoringEngine } from '@/lib/scoring'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate, getDaysUntil } from '@/lib/utils'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'

// Mock data - in production this would come from API
const MOCK_DOMAIN = {
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
  registrarId: 101,
  createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
  lastRenewedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  recentEvents: [
    { type: 'OFFER_RECEIVED', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
    { type: 'LISTED', timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
  ]
}

// Mock historical data for charts
const MOCK_HISTORY = Array.from({ length: 30 }, (_, i) => ({
  day: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  risk: Math.max(10, Math.min(90, 30 + Math.random() * 20 - 10)),
  momentum: Math.max(0, Math.min(100, 50 + Math.random() * 30 - 15)),
  forecast: Math.max(20, Math.min(80, 60 + Math.random() * 20 - 10)),
}))

export default function DomainDetailPage() {
  const params = useParams()
  const [domain, setDomain] = useState<typeof MOCK_DOMAIN | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading domain data
    setTimeout(() => {
      setDomain(MOCK_DOMAIN)
      setLoading(false)
    }, 500)
  }, [params.id])

  if (loading || !domain) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const scores = scoringEngine.calculateScores(domain)
  const daysUntilExpiry = getDaysUntil(domain.expiresAt)
  const fullName = `${domain.name}.${domain.tld}`

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {fullName}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Token #{domain.tokenId}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Link
                href={`https://explorer-testnet.doma.xyz/token/${domain.tokenAddress}?tokenId=${domain.tokenId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg flex items-center gap-2 hover:shadow-lg transition-all"
              >
                View on Explorer
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <ScoreDisplay
            label="Risk Score"
            value={scores.risk}
            type="risk"
            factors={scores.explainers.risk}
          />
          <ScoreDisplay
            label="Rarity Score"
            value={scores.rarity}
            type="rarity"
            factors={scores.explainers.rarity}
          />
          <ScoreDisplay
            label="Momentum Score"
            value={scores.momentum}
            type="momentum"
            factors={scores.explainers.momentum}
          />
          <ScoreDisplay
            label="6M Forecast"
            value={scores.forecast}
            type="forecast"
            factors={scores.explainers.forecast}
            confidenceInterval={{ low: scores.forecastLow, high: scores.forecastHigh }}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Domain Information */}
          <div className="lg:col-span-1">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Domain Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Owner</p>
                  <p className="font-mono text-sm">{domain.ownerAddress}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Expires In</p>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <p className="font-semibold">{daysUntilExpiry} days</p>
                    <span className="text-sm text-gray-500">({formatDate(domain.expiresAt)})</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Lock Status</p>
                  <div className="flex items-center gap-2">
                    {domain.lockStatus ? (
                      <>
                        <Lock className="w-4 h-4 text-orange-500" />
                        <span className="text-orange-600 dark:text-orange-400">Locked</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 text-green-500" />
                        <span className="text-green-600 dark:text-green-400">Unlocked</span>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Renewal History</p>
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-gray-500" />
                    <p>{domain.renewalCount} renewals</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Market Activity</p>
                  <div className="flex gap-4">
                    <div>
                      <p className="text-xs text-gray-500">7d</p>
                      <p className="font-semibold">{domain.activity7d}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">30d</p>
                      <p className="font-semibold">{domain.activity30d}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Offers</p>
                      <p className="font-semibold">{domain.offerCount}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <button className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                  Make Offer
                </button>
                <button className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
                  Add to Watchlist
                </button>
                <button className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  Set Alert
                </button>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="lg:col-span-2 space-y-6">
            {/* Historical Scores Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Historical Score Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={MOCK_HISTORY}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="day" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                      labelStyle={{ color: '#9ca3af' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="risk" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      dot={false}
                      name="Risk"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="momentum" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={false}
                      name="Momentum"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="forecast" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      dot={false}
                      name="Forecast"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Forecast Projection */}
            <Card>
              <CardHeader>
                <CardTitle>6-Month Value Forecast</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart 
                    data={[
                      ...MOCK_HISTORY.slice(-7),
                      ...Array.from({ length: 180 }, (_, i) => ({
                        day: `+${i + 1}d`,
                        forecast: scores.forecast,
                        low: scores.forecastLow,
                        high: scores.forecastHigh,
                      }))
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="day" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                      labelStyle={{ color: '#9ca3af' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="high"
                      stackId="1"
                      stroke="transparent"
                      fill="#3b82f6"
                      fillOpacity={0.2}
                      name="Upper Bound"
                    />
                    <Area
                      type="monotone"
                      dataKey="forecast"
                      stackId="2"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="#3b82f6"
                      fillOpacity={0.4}
                      name="Forecast"
                    />
                    <Area
                      type="monotone"
                      dataKey="low"
                      stackId="3"
                      stroke="transparent"
                      fill="#3b82f6"
                      fillOpacity={0.2}
                      name="Lower Bound"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}