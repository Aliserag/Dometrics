'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Shield, Clock, TrendingUp, AlertCircle, ExternalLink, DollarSign, Loader2 } from 'lucide-react'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import { ScoringEngine } from '@/lib/scoring'
import { domaClient } from '@/lib/doma-client'
import type { DomainModel } from '@/lib/doma-client'

// Configure Highcharts theme
if (typeof Highcharts !== 'undefined') {
  Highcharts.setOptions({
    colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'],
    chart: {
      style: {
        fontFamily: 'Inter, system-ui, sans-serif'
      }
    }
  })
}

const scoringEngine = new ScoringEngine()

// Default demo domains for fallback
const demoDomains: Record<string, any> = {
  '1001': {
    id: '1001',
    name: 'crypto.xyz',
    namePart: 'crypto',
    tld: 'xyz',
    tokenId: '1001',
    expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    lockStatus: false,
    registrarId: 1,
    registrar: 'GoDaddy',
    renewalCount: 2,
    offerCount: 3,
    activity7d: 15,
    activity30d: 42,
    price: 5000,
    owner: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
  },
  '1002': {
    id: '1002',
    name: 'defi.com',
    namePart: 'defi',
    tld: 'com',
    tokenId: '1002',
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    lockStatus: false,
    registrarId: 1,
    registrar: 'Namecheap',
    renewalCount: 1,
    offerCount: 5,
    activity7d: 8,
    activity30d: 25,
    price: 12000,
    owner: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    createdAt: new Date(Date.now() - 730 * 24 * 60 * 60 * 1000),
  },
  '1003': {
    id: '1003',
    name: 'web3.io',
    namePart: 'web3',
    tld: 'io',
    tokenId: '1003',
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    lockStatus: true,
    registrarId: 2,
    registrar: 'Google Domains',
    renewalCount: 3,
    offerCount: 1,
    activity7d: 3,
    activity30d: 10,
    price: 3500,
    owner: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
    createdAt: new Date(Date.now() - 500 * 24 * 60 * 60 * 1000),
  },
  '1004': {
    id: '1004',
    name: 'meta.verse',
    namePart: 'meta',
    tld: 'verse',
    tokenId: '1004',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    lockStatus: false,
    registrarId: 1,
    registrar: 'GoDaddy',
    renewalCount: 0,
    offerCount: 8,
    activity7d: 25,
    activity30d: 78,
    price: 8900,
    owner: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
    createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
  },
  '1005': {
    id: '1005',
    name: 'nft.market',
    namePart: 'nft',
    tld: 'market',
    tokenId: '1005',
    expiresAt: new Date(Date.now() + 200 * 24 * 60 * 60 * 1000),
    lockStatus: false,
    registrarId: 3,
    registrar: 'ENS',
    renewalCount: 1,
    offerCount: 2,
    activity7d: 5,
    activity30d: 18,
    price: 6500,
    owner: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    createdAt: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000),
  },
}

// Generate mock historical data
const generateHistoricalData = () => {
  const data = []
  const now = Date.now()
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000)
    data.push([
      date.getTime(),
      Math.floor(3000 + Math.random() * 2000 + (29 - i) * 50)
    ])
  }
  return data
}

export default function DomainDetailPage() {
  const params = useParams()
  const [domain, setDomain] = useState<any>(null)
  const [scores, setScores] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDomainData()
  }, [params.id])

  const fetchDomainData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const tokenId = params.id as string
      
      // First try to get from demo data
      if (demoDomains[tokenId]) {
        const domainData = demoDomains[tokenId]
        setDomain(domainData)
        
        // Calculate scores with better risk calculation
        const daysUntilExpiry = Math.floor(
          (domainData.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
        
        const calculatedScores = scoringEngine.calculateScores({
          name: domainData.namePart,
          tld: domainData.tld,
          expiresAt: domainData.expiresAt,
          lockStatus: domainData.lockStatus,
          registrarId: domainData.registrarId,
          renewalCount: domainData.renewalCount,
          offerCount: domainData.offerCount,
          activity7d: domainData.activity7d,
          activity30d: domainData.activity30d,
        })
        setScores(calculatedScores)
      } else {
        // Try to fetch real domain from testnet by tokenId
        try {
          const names = await domaClient.getAllNames(100)
          const foundToken = names.find(name => 
            name.tokens.some(token => token.tokenId === tokenId)
          )
          
          if (foundToken) {
            const token = foundToken.tokens.find(t => t.tokenId === tokenId)!
            const parts = foundToken.name.split('.')
            const namePart = parts[0]
            const tld = parts.slice(1).join('.') || 'com'
            
            const domainData = {
              id: tokenId,
              name: foundToken.name,
              namePart,
              tld,
              tokenId,
              tokenAddress: token.tokenAddress,
              owner: token.ownerAddress,
              expiresAt: new Date(token.expiresAt),
              explorerUrl: token.explorerUrl,
              registrar: foundToken.registrar?.name || 'Unknown',
              transferLock: foundToken.transferLock,
              lockStatus: foundToken.transferLock || false,
              registrarId: foundToken.registrar?.ianaId ? parseInt(foundToken.registrar.ianaId) : 1,
              renewalCount: Math.floor(Math.random() * 3),
              offerCount: Math.floor(Math.random() * 10),
              activity7d: Math.floor(Math.random() * 20) + 5,
              activity30d: Math.floor(Math.random() * 50) + 15,
              price: Math.floor(Math.random() * 10000) + 1000,
              createdAt: foundToken.tokenizedAt ? new Date(foundToken.tokenizedAt) : new Date(),
            }
            
            setDomain(domainData)
            
            const calculatedScores = scoringEngine.calculateScores({
              name: domainData.namePart,
              tld: domainData.tld,
              expiresAt: domainData.expiresAt,
              lockStatus: domainData.lockStatus,
              registrarId: domainData.registrarId,
              renewalCount: domainData.renewalCount,
              offerCount: domainData.offerCount,
              activity7d: domainData.activity7d,
              activity30d: domainData.activity30d,
            })
            setScores(calculatedScores)
          } else {
            // Fallback to demo domain
            const domainData = demoDomains['1001']
            setDomain(domainData)
            
            const calculatedScores = scoringEngine.calculateScores({
              name: domainData.namePart,
              tld: domainData.tld,
              expiresAt: domainData.expiresAt,
              lockStatus: domainData.lockStatus,
              registrarId: domainData.registrarId,
              renewalCount: domainData.renewalCount,
              offerCount: domainData.offerCount,
              activity7d: domainData.activity7d,
              activity30d: domainData.activity30d,
            })
            setScores(calculatedScores)
          }
        } catch (err) {
          console.error('Error fetching real domain:', err)
          // Final fallback
          const domainData = demoDomains['1001']
          setDomain(domainData)
          
          const calculatedScores = scoringEngine.calculateScores({
            name: domainData.namePart,
            tld: domainData.tld,
            expiresAt: domainData.expiresAt,
            lockStatus: domainData.lockStatus,
            registrarId: domainData.registrarId,
            renewalCount: domainData.renewalCount,
            offerCount: domainData.offerCount,
            activity7d: domainData.activity7d,
            activity30d: domainData.activity30d,
          })
          setScores(calculatedScores)
        }
      }
    } catch (err) {
      console.error('Error fetching domain:', err)
      setError('Failed to load domain details')
      // Use first demo domain as fallback
      const domainData = demoDomains['1001']
      setDomain(domainData)
      
      const calculatedScores = scoringEngine.calculateScores({
        name: domainData.namePart,
        tld: domainData.tld,
        expiresAt: domainData.expiresAt,
        lockStatus: domainData.lockStatus,
        registrarId: domainData.registrarId,
        renewalCount: domainData.renewalCount,
        offerCount: domainData.offerCount,
        activity7d: domainData.activity7d,
        activity30d: domainData.activity30d,
      })
      setScores(calculatedScores)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading || !domain || !scores) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading domain details...</span>
        </div>
      </div>
    )
  }

  // Modern gauge chart for scores
  const createGaugeOptions = (score: number, title: string, color: string) => ({
    chart: {
      type: 'solidgauge',
      backgroundColor: 'transparent',
      height: 200,
    },
    title: {
      text: title,
      style: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#374151'
      },
      y: 20
    },
    pane: {
      center: ['50%', '70%'],
      size: '100%',
      startAngle: -90,
      endAngle: 90,
      background: {
        innerRadius: '60%',
        outerRadius: '100%',
        shape: 'arc',
        backgroundColor: '#f3f4f6',
      }
    },
    tooltip: {
      enabled: false
    },
    yAxis: {
      min: 0,
      max: 100,
      stops: [
        [0.1, color],
        [0.8, color],
        [0.9, Highcharts.color(color).brighten(0.1).get()]
      ],
      lineWidth: 0,
      tickWidth: 0,
      minorTickInterval: null,
      tickAmount: 2,
      title: {
        text: `<div style="text-align:center"><span style="font-size:28px;font-weight:700;color:#111827">${score}</span><br/><span style="font-size:12px;color:#6b7280">/ 100</span></div>`,
        useHTML: true,
        y: -30
      },
      labels: {
        enabled: false
      }
    },
    plotOptions: {
      solidgauge: {
        borderRadius: 8,
        dataLabels: {
          enabled: false
        },
        linecap: 'round',
        stickyTracking: false,
        rounded: true
      }
    },
    series: [{
      name: title,
      data: [score],
      dataLabels: {
        enabled: false
      }
    }],
    credits: {
      enabled: false
    }
  })

  // Beautiful area chart for value trend
  const trendChartOptions = {
    chart: {
      type: 'area',
      backgroundColor: 'transparent',
      height: 300,
      style: {
        fontFamily: 'Inter, system-ui, sans-serif'
      }
    },
    title: {
      text: null
    },
    xAxis: {
      type: 'datetime',
      labels: {
        style: {
          color: '#6b7280',
          fontSize: '11px'
        }
      },
      lineColor: '#e5e7eb',
      tickColor: '#e5e7eb',
      gridLineWidth: 0
    },
    yAxis: {
      title: {
        text: null
      },
      labels: {
        style: {
          color: '#6b7280',
          fontSize: '11px'
        },
        formatter: function(this: any) {
          return '$' + (this.value / 1000).toFixed(1) + 'k'
        }
      },
      gridLineColor: '#f3f4f6',
      gridLineDashStyle: 'Dash' as any
    },
    legend: {
      enabled: false
    },
    tooltip: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e5e7eb',
      borderRadius: 8,
      borderWidth: 1,
      shadow: {
        color: 'rgba(0, 0, 0, 0.1)',
        offsetX: 0,
        offsetY: 2,
        opacity: 0.1,
        width: 4
      },
      style: {
        color: '#111827',
        fontSize: '12px'
      },
      formatter: function(this: any) {
        return `<b>${Highcharts.dateFormat('%b %e', this.x)}</b><br/>Value: <b>$${this.y.toLocaleString()}</b>`
      },
      useHTML: true
    },
    plotOptions: {
      area: {
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, 'rgba(59, 130, 246, 0.15)'],
            [1, 'rgba(59, 130, 246, 0.02)']
          ]
        },
        marker: {
          enabled: false,
          symbol: 'circle',
          radius: 3,
          states: {
            hover: {
              enabled: true,
              lineColor: '#3b82f6',
              lineWidth: 2
            }
          }
        },
        lineWidth: 2,
        lineColor: '#3b82f6',
        states: {
          hover: {
            lineWidth: 2
          }
        },
        threshold: null
      }
    },
    series: [{
      name: 'Value',
      data: generateHistoricalData(),
      turboThreshold: 0
    }],
    credits: {
      enabled: false
    }
  }

  // Modern column chart for activity
  const activityChartOptions = {
    chart: {
      type: 'column',
      backgroundColor: 'transparent',
      height: 200,
      style: {
        fontFamily: 'Inter, system-ui, sans-serif'
      }
    },
    title: {
      text: null
    },
    xAxis: {
      categories: ['7 Days', '30 Days'],
      labels: {
        style: {
          color: '#6b7280',
          fontSize: '12px'
        }
      },
      lineColor: '#e5e7eb',
      tickColor: '#e5e7eb'
    },
    yAxis: {
      min: 0,
      title: {
        text: null
      },
      labels: {
        style: {
          color: '#6b7280',
          fontSize: '11px'
        }
      },
      gridLineColor: '#f3f4f6',
      gridLineDashStyle: 'Dash' as any
    },
    legend: {
      enabled: false
    },
    tooltip: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e5e7eb',
      borderRadius: 8,
      borderWidth: 1,
      style: {
        color: '#111827',
        fontSize: '12px'
      },
      formatter: function(this: any) {
        return `<b>${this.x}</b><br/>Activities: <b>${this.y}</b>`
      },
      useHTML: true
    },
    plotOptions: {
      column: {
        borderRadius: 6,
        borderWidth: 0,
        dataLabels: {
          enabled: true,
          style: {
            color: '#374151',
            fontSize: '12px',
            fontWeight: '600',
            textOutline: 'none'
          }
        }
      }
    },
    series: [{
      data: [
        { y: domain.activity7d, color: '#3b82f6' },
        { y: domain.activity30d, color: '#8b5cf6' }
      ]
    }],
    credits: {
      enabled: false
    }
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
            </div>
            <Link href="/" className="text-xl font-bold text-gray-900 dark:text-white">
              Dometrics
            </Link>
          </div>
        </div>
      </header>

      {/* Domain Header */}
      <section className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {domain.name}
                </h1>
                {domain.lockStatus && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 rounded-md">
                    <Shield className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
                    <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300">Locked</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <span className="font-mono">{domain.owner.slice(0, 6)}...{domain.owner.slice(-4)}</span>
                <span>•</span>
                <span>{domain.registrar}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {Math.floor((domain.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-gray-400" />
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {domain.price.toLocaleString()}
                </span>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Current Value
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Score Gauges */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Domain Scores
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <HighchartsReact 
                highcharts={Highcharts} 
                options={createGaugeOptions(scores.risk, 'Risk Score', scores.risk < 30 ? '#10b981' : scores.risk < 70 ? '#f59e0b' : '#ef4444')} 
              />
            </div>
            <div>
              <HighchartsReact 
                highcharts={Highcharts} 
                options={createGaugeOptions(scores.rarity, 'Rarity Score', '#3b82f6')} 
              />
            </div>
            <div>
              <HighchartsReact 
                highcharts={Highcharts} 
                options={createGaugeOptions(scores.momentum, 'Momentum', '#8b5cf6')} 
              />
            </div>
            <div>
              <HighchartsReact 
                highcharts={Highcharts} 
                options={createGaugeOptions(scores.forecast, 'Forecast', '#06b6d4')} 
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Value Trend Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              30-Day Value Trend
            </h2>
            <HighchartsReact highcharts={Highcharts} options={trendChartOptions} />
          </div>

          {/* Activity Chart */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Activity Overview
            </h2>
            <HighchartsReact highcharts={Highcharts} options={activityChartOptions} />
            
            {/* Quick Stats */}
            <div className="mt-6 space-y-3">
              <div className="flex justify-between items-center py-2 border-t border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-600 dark:text-gray-400">Renewals</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{domain.renewalCount}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-t border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-600 dark:text-gray-400">Active Offers</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{domain.offerCount}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-t border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-600 dark:text-gray-400">Created</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {domain.createdAt.toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-4">
          <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
            View on Doma Explorer
          </button>
          <button className="px-6 py-3 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors">
            Set Alert
          </button>
          <button className="px-6 py-3 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors">
            Export Data
          </button>
        </div>
      </main>
    </div>
  )
}