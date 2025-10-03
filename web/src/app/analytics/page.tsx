'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { TrendingUp, TrendingDown, ArrowLeft, BarChart3, PieChart, Activity, Filter, Download } from 'lucide-react'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import { ScoringEngine } from '@/lib/scoring'
import { domaClient } from '@/lib/doma-client'

// Configure Highcharts theme
if (typeof Highcharts !== 'undefined') {
  Highcharts.setOptions({
    colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'],
  })
}

const scoringEngine = new ScoringEngine()

// TLD analytics data
interface TLDStats {
  tld: string
  count: number
  avgRisk: number
  avgRarity: number
  avgMomentum: number
  totalValue: number
  change7d: number
  change30d: number
}

export default function AnalyticsPage() {
  const [domains, setDomains] = useState<any[]>([])
  const [tldStats, setTLDStats] = useState<TLDStats[]>([])
  const [selectedTLD, setSelectedTLD] = useState<string>('all')
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchAnalyticsData()
  }, [])

  // Force charts to update when time range changes
  useEffect(() => {
    // Trigger a visual update by modifying a key or re-rendering charts
    if (domains.length > 0) {
      // Re-set the same data to force chart update
      setTLDStats([...tldStats])
    }
  }, [timeRange])

  const fetchAnalyticsData = async () => {
    setIsLoading(true)
    
    try {
      const names = await domaClient.getAllNames(100)
      const transformedDomains = []
      const tldMap = new Map<string, any>()
      
      for (const name of names) {
        if (!name.tokens || name.tokens.length === 0) continue
        
        for (const token of name.tokens) {
          const parts = name.name.split('.')
          const namePart = parts[0]
          const tld = parts.slice(1).join('.') || 'com'
          
          const daysUntilExpiry = Math.floor(
            (new Date(token.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          )
          
          const isPopularTLD = ['com', 'ai', 'io', 'xyz'].includes(tld)
          const isShortName = namePart.length < 8
          
          // Use deterministic values based on domain characteristics
          const domainSeed = namePart.length + tld.length
          const activity7d = isPopularTLD ? 15 + (domainSeed % 10) : 5 + (domainSeed % 5)
          const activity30d = activity7d * 3
          
          const scores = scoringEngine.calculateScoresSync({
            name: namePart,
            tld,
            expiresAt: new Date(token.expiresAt),
            lockStatus: name.transferLock || false,
            registrarId: name.registrar?.ianaId ? parseInt(name.registrar.ianaId) : 1,
            renewalCount: 0, // Real renewal count not available from API
            offerCount: 0, // Real offer count would come from API,
            activity7d,
            activity30d,
          })
          
          const domain = {
            id: token.tokenId,
            name: name.name,
            namePart,
            tld,
            tokenId: token.tokenId,
            scores,
            value: Math.round(scores.currentValue || 1000),
            daysUntilExpiry,
          }
          
          transformedDomains.push(domain)
          
          // Aggregate TLD stats
          if (!tldMap.has(tld)) {
            tldMap.set(tld, {
              tld,
              count: 0,
              totalRisk: 0,
              totalRarity: 0,
              totalMomentum: 0,
              totalValue: 0,
              change7d: 0, // Real change data would come from historical API
              change30d: 0, // Real change data would come from historical API
            })
          }
          
          const stat = tldMap.get(tld)
          stat.count++
          stat.totalRisk += scores.risk
          stat.totalRarity += scores.rarity
          stat.totalMomentum += scores.momentum
          stat.totalValue += domain.value
        }
      }
      
      // Convert to final TLD stats
      const finalTLDStats: TLDStats[] = Array.from(tldMap.values()).map(stat => ({
        tld: stat.tld,
        count: stat.count,
        avgRisk: Math.round(stat.totalRisk / stat.count),
        avgRarity: Math.round(stat.totalRarity / stat.count),
        avgMomentum: Math.round(stat.totalMomentum / stat.count),
        totalValue: stat.totalValue,
        change7d: stat.change7d,
        change30d: stat.change30d,
      })).sort((a, b) => b.count - a.count)
      
      setDomains(transformedDomains)
      setTLDStats(finalTLDStats)
    } catch (error) {
      console.error('Error fetching analytics data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Chart configurations
  const tldDistributionOptions = {
    chart: {
      type: 'pie',
      backgroundColor: 'transparent',
      height: 300,
    },
    title: {
      text: null
    },
    tooltip: {
      backgroundColor: 'rgba(17, 24, 39, 0.95)',
      borderColor: '#374151',
      style: {
        color: '#f3f4f6'
      },
      pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b><br/>Count: <b>{point.y}</b>'
    },
    accessibility: {
      point: {
        valueSuffix: '%'
      }
    },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        cursor: 'pointer',
        borderRadius: 5,
        borderWidth: 2,
        borderColor: '#1f2937',
        dataLabels: {
          enabled: true,
          format: '<b>.{point.name}</b><br/>{point.percentage:.1f}%',
          style: {
            fontSize: '11px',
            fontWeight: '500',
            color: '#f3f4f6',
            textOutline: '1px contrast'
          }
        }
      }
    },
    series: [{
      name: 'Domains',
      data: tldStats.slice(0, 8).map(stat => ({
        name: stat.tld,
        y: stat.count
      }))
    }],
    credits: {
      enabled: false
    }
  }

  const valueVsMomentumOptions = {
    chart: {
      type: 'scatter',
      backgroundColor: 'transparent',
      height: 300,
    },
    title: {
      text: null
    },
    xAxis: {
      title: {
        text: 'Momentum Score',
        style: {
          color: '#9ca3af'
        }
      },
      labels: {
        style: {
          color: '#9ca3af'
        }
      },
      min: 0,
      max: 100,
      gridLineColor: '#374151'
    },
    yAxis: {
      title: {
        text: 'Estimated Value ($)',
        style: {
          color: '#9ca3af'
        }
      },
      labels: {
        style: {
          color: '#9ca3af'
        },
        formatter: function() {
          return '$' + (this.value / 1000).toFixed(0) + 'k'
        }
      },
      gridLineColor: '#374151'
    },
    tooltip: {
      backgroundColor: 'rgba(17, 24, 39, 0.95)',
      borderColor: '#374151',
      style: {
        color: '#f3f4f6'
      },
      headerFormat: '<b>{point.key}</b><br>',
      pointFormat: 'Momentum: {point.x}<br/>Value: ${point.y:,.0f}'
    },
    plotOptions: {
      scatter: {
        marker: {
          radius: 4,
          symbol: 'circle',
          states: {
            hover: {
              enabled: true,
              lineColor: '#3b82f6'
            }
          }
        }
      }
    },
    series: [{
      name: 'Domains',
      color: '#3b82f6',
      data: domains.slice(0, 50).map(d => ({
        x: d.scores?.momentum || 0,
        y: d.scores?.currentValue || d.value || 1000,
        name: d.name
      }))
    }],
    credits: {
      enabled: false
    }
  }

  const scoreComparisonOptions = {
    chart: {
      type: 'scatter',
      backgroundColor: 'transparent',
      height: 400,
    },
    title: {
      text: null
    },
    xAxis: {
      title: {
        text: 'Risk Score',
        style: {
          color: '#9ca3af'
        }
      },
      labels: {
        style: {
          color: '#9ca3af'
        }
      },
      min: 0,
      max: 100,
      gridLineColor: '#374151'
    },
    yAxis: {
      title: {
        text: 'Rarity Score',
        style: {
          color: '#9ca3af'
        }
      },
      labels: {
        style: {
          color: '#9ca3af'
        }
      },
      min: 0,
      max: 100,
      gridLineColor: '#374151'
    },
    tooltip: {
      backgroundColor: 'rgba(17, 24, 39, 0.95)',
      borderColor: '#374151',
      style: {
        color: '#f3f4f6'
      },
      headerFormat: '<b>{point.key}</b><br>',
      pointFormat: 'Risk: {point.x}<br/>Rarity: {point.y}'
    },
    plotOptions: {
      scatter: {
        marker: {
          radius: 5,
          states: {
            hover: {
              enabled: true,
              lineColor: 'rgb(100,100,100)'
            }
          }
        },
        states: {
          hover: {
            marker: {
              enabled: false
            }
          }
        }
      }
    },
    series: [{
      name: 'Domains',
      data: domains.slice(0, 50).map(d => ({
        x: d.scores?.risk || 0,
        y: d.scores?.rarity || 0,
        name: d.name
      }))
    }],
    credits: {
      enabled: false
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Back</span>
              </Link>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Analytics</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={selectedTLD}
                onChange={(e) => setSelectedTLD(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All TLDs</option>
                {tldStats.slice(0, 10).map(stat => (
                  <option key={stat.tld} value={stat.tld}>.{stat.tld}</option>
                ))}
              </select>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="7d">7 Days</option>
                <option value="30d">30 Days</option>
                <option value="90d">90 Days</option>
              </select>
              <button className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors">
                <Download className="w-3 h-3" />
                Export
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Domains</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{domains.length}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-xs">
              <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
              <span className="text-green-600 dark:text-green-400">+12.5%</span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">vs last month</span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Risk Score</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.round(domains.reduce((acc, d) => acc + (d.scores?.risk || 0), 0) / domains.length) || 0}
                </p>
              </div>
              <div className="w-8 h-8 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-xs">
              <TrendingDown className="w-3 h-3 text-green-500 mr-1" />
              <span className="text-green-600 dark:text-green-400">-3.2%</span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">risk reduced</span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">High Value Domains</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {domains.filter(d => d.value > 5000).length}
                </p>
              </div>
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-xs">
              <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
              <span className="text-green-600 dark:text-green-400">+8.1%</span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">value increase</span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active TLDs</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{tldStats.length}</p>
              </div>
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <PieChart className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-xs">
              <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
              <span className="text-green-600 dark:text-green-400">+2</span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">new TLDs</span>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">TLD Distribution</h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {timeRange === '7d' ? 'Last 7 days' : timeRange === '30d' ? 'Last 30 days' : 'Last 90 days'}
              </span>
            </div>
            <HighchartsReact key={`tld-${timeRange}`} highcharts={Highcharts} options={tldDistributionOptions} />
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Value vs Momentum</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Identify high-momentum opportunities</p>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {timeRange === '7d' ? 'Last 7 days' : timeRange === '30d' ? 'Last 30 days' : 'Last 90 days'}
              </span>
            </div>
            <HighchartsReact key={`momentum-${timeRange}`} highcharts={Highcharts} options={valueVsMomentumOptions} />
          </div>
        </div>

        {/* Risk vs Rarity Scatter */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Risk vs Rarity Analysis</h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {timeRange === '7d' ? 'Last 7 days' : timeRange === '30d' ? 'Last 30 days' : 'Last 90 days'}
            </span>
          </div>
          <HighchartsReact key={`scatter-${timeRange}`} highcharts={Highcharts} options={scoreComparisonOptions} />
        </div>

        {/* TLD Performance Table */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">TLD Performance</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    TLD
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Domains
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Avg Risk
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Avg Rarity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Total Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    30d Change
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {tldStats.slice(0, 10).map((stat) => (
                  <tr key={stat.tld} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      .{stat.tld}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {stat.count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        stat.avgRisk < 30 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' 
                          : stat.avgRisk < 70 
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                      }`}>
                        {stat.avgRisk}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {stat.avgRarity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      ${stat.totalValue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`flex items-center ${
                        stat.change30d > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {stat.change30d > 0 ? (
                          <TrendingUp className="w-3 h-3 mr-1" />
                        ) : (
                          <TrendingDown className="w-3 h-3 mr-1" />
                        )}
                        {stat.change30d > 0 ? '+' : ''}{stat.change30d.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}