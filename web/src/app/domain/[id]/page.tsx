'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Shield, Clock, TrendingUp, AlertCircle, ExternalLink, DollarSign, Loader2, Info, Brain, CheckCircle, AlertTriangle, XCircle, Bell, Download, ShoppingCart } from 'lucide-react'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import { ScoringEngine } from '@/lib/scoring'
import { domaClient } from '@/lib/doma-client'
import type { DomainModel } from '@/lib/doma-client'
import { aiValuationService, type DomainAnalysis } from '@/lib/ai-valuation'

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
  const [analysis, setAnalysis] = useState<DomainAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [alerts, setAlerts] = useState<any[]>([])
  const [alertForm, setAlertForm] = useState({
    type: 'expiry',
    threshold: 30,
    enabled: true
  })

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
        
        const calculatedScores = await scoringEngine.calculateScores({
          name: domainData.namePart,
          tld: domainData.tld,
          expiresAt: domainData.expiresAt,
          lockStatus: domainData.lockStatus,
          registrarId: domainData.registrarId,
          renewalCount: domainData.renewalCount,
          offerCount: domainData.offerCount,
          activity7d: domainData.activity7d,
          activity30d: domainData.activity30d,
          registrar: domainData.registrar,
        })
        setScores(calculatedScores)
        
        // Get AI analysis
        await generateAnalysis(domainData, calculatedScores)
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
            
            const calculatedScores = await scoringEngine.calculateScores({
              name: domainData.namePart,
              tld: domainData.tld,
              expiresAt: domainData.expiresAt,
              lockStatus: domainData.lockStatus,
              registrarId: domainData.registrarId,
              renewalCount: domainData.renewalCount,
              offerCount: domainData.offerCount,
              activity7d: domainData.activity7d,
              activity30d: domainData.activity30d,
              registrar: domainData.registrar,
            })
            setScores(calculatedScores)
          } else {
            // Fallback to demo domain
            const domainData = demoDomains['1001']
            setDomain(domainData)
            
            const calculatedScores = await scoringEngine.calculateScores({
              name: domainData.namePart,
              tld: domainData.tld,
              expiresAt: domainData.expiresAt,
              lockStatus: domainData.lockStatus,
              registrarId: domainData.registrarId,
              renewalCount: domainData.renewalCount,
              offerCount: domainData.offerCount,
              activity7d: domainData.activity7d,
              activity30d: domainData.activity30d,
              registrar: domainData.registrar,
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

  const generateAnalysis = async (domainData: any, calculatedScores: any) => {
    if (!calculatedScores) return
    
    setIsAnalyzing(true)
    try {
      const daysUntilExpiry = Math.floor(
        (domainData.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
      
      const analysisResult = await aiValuationService.analyzeDomain(
        domainData.namePart,
        domainData.tld,
        {
          risk: calculatedScores.risk,
          rarity: calculatedScores.rarity,
          momentum: calculatedScores.momentum,
          currentValue: calculatedScores.currentValue,
          projectedValue: calculatedScores.projectedValue,
        },
        {
          daysUntilExpiry,
          offerCount: domainData.offerCount || 0,
          activity30d: domainData.activity30d || 0,
          registrar: domainData.registrar || 'Unknown',
          transferLock: domainData.lockStatus || false,
        }
      )
      
      setAnalysis(analysisResult)
    } catch (error) {
      console.error('Error generating analysis:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Load existing alerts for this domain
  useEffect(() => {
    const storedAlerts = localStorage.getItem('domain-alerts')
    if (storedAlerts) {
      const allAlerts = JSON.parse(storedAlerts)
      const domainAlerts = allAlerts.filter((alert: any) => alert.domainId === params.id)
      setAlerts(domainAlerts)
    }
  }, [params.id])

  // Export domain data
  const handleExport = () => {
    const exportData = {
      domain: {
        name: domain.name,
        tokenId: domain.tokenId,
        owner: domain.owner,
        expiresAt: domain.expiresAt.toISOString(),
        registrar: domain.registrar,
        lockStatus: domain.lockStatus
      },
      scores,
      analysis,
      marketData: {
        activity7d: domain.activity7d,
        activity30d: domain.activity30d,
        offerCount: domain.offerCount,
        renewalCount: domain.renewalCount,
        price: domain.price
      },
      exportedAt: new Date().toISOString()
    }

    const dataStr = JSON.stringify(exportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${domain.name.replace('.', '_')}_analysis.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // View on Doma Explorer
  const handleViewExplorer = () => {
    if (domain.explorerUrl) {
      window.open(domain.explorerUrl, '_blank')
    } else {
      // Construct explorer URL for Doma testnet
      const explorerUrl = `https://explorer-testnet.doma.xyz/token/${domain.tokenAddress || '0x0000000000000000000000000000000000000000'}?tokenId=${domain.tokenId}`
      window.open(explorerUrl, '_blank')
    }
  }

  // Save alert
  const handleSaveAlert = () => {
    const newAlert = {
      id: Date.now().toString(),
      domainId: params.id,
      domainName: domain.name,
      type: alertForm.type,
      threshold: alertForm.threshold,
      enabled: alertForm.enabled,
      createdAt: new Date().toISOString()
    }

    const storedAlerts = localStorage.getItem('domain-alerts')
    const allAlerts = storedAlerts ? JSON.parse(storedAlerts) : []
    allAlerts.push(newAlert)
    localStorage.setItem('domain-alerts', JSON.stringify(allAlerts))
    
    setAlerts([...alerts, newAlert])
    setShowAlertModal(false)
    
    // Show success notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`Alert created for ${domain.name}`, {
        body: `You'll be notified when ${alertForm.type} conditions are met.`,
        icon: '/favicon.ico'
      })
    }
  }

  // Remove alert
  const handleRemoveAlert = (alertId: string) => {
    const storedAlerts = localStorage.getItem('domain-alerts')
    if (storedAlerts) {
      const allAlerts = JSON.parse(storedAlerts)
      const updatedAlerts = allAlerts.filter((alert: any) => alert.id !== alertId)
      localStorage.setItem('domain-alerts', JSON.stringify(updatedAlerts))
      setAlerts(alerts.filter(alert => alert.id !== alertId))
    }
  }

  // Buy domain on Doma Dashboard
  const handleBuyDomain = () => {
    const dashboardUrl = `https://dashboard-testnet.doma.xyz/domain/${domain.name}`
    window.open(dashboardUrl, '_blank')
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

  // Score explanations
  const scoreExplanations = {
    risk: {
      title: 'Risk Score',
      description: 'Measures potential risks including expiration, transfer locks, registrar quality, and tokenization recency. Higher scores indicate higher risk.',
      calculation: 'Based on days until expiration (40%), lock status (20%), registrar quality (15%), renewal history (10%), market liquidity (5%), and tokenization recency (10%). Recently tokenized domains may carry higher risk due to limited history.'
    },
    rarity: {
      title: 'Rarity Score', 
      description: 'Evaluates how unique and valuable the domain is based on length, brandability, and TLD scarcity.',
      calculation: 'Based on name length (40%), dictionary/brandable words (25%), TLD scarcity (25%), and historic demand (10%).'
    },
    momentum: {
      title: 'Momentum Score',
      description: 'Tracks recent market activity and trending interest in the domain.',
      calculation: 'Based on activity delta between 7d vs 30d periods (70%) and recent events like transfers or listings (30%).'
    },
    forecast: {
      title: 'Forecast Score',
      description: 'Predictive score for 6-month value projection based on current market signals and domain characteristics.',
      calculation: 'Linear blend: Base value × (1 + 0.5×momentum + 0.3×rarity - 0.4×risk). Represents projected percentage change in value.'
    }
  }

  // Tooltip component (hidden info icon version)
  const ScoreTooltip = ({ children, explanation }: { children: React.ReactNode; explanation: typeof scoreExplanations.risk }) => {
    const [showTooltip, setShowTooltip] = useState(false)
    
    return (
      <div className="relative">
        <div 
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="cursor-help"
        >
          {children}
        </div>
        {showTooltip && (
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-10">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{explanation.title}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{explanation.description}</p>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              <strong>Calculation:</strong> {explanation.calculation}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Custom circular progress component
  const CircularProgress = ({ 
    score, 
    title, 
    color, 
    explanation 
  }: { 
    score: number; 
    title: string; 
    color: string; 
    explanation: typeof scoreExplanations.risk 
  }) => {
    const radius = 60
    const strokeWidth = 8
    const normalizedRadius = radius - strokeWidth * 2
    const circumference = normalizedRadius * 2 * Math.PI
    const strokeDasharray = `${circumference} ${circumference}`
    const strokeDashoffset = circumference - (score / 100) * circumference

    return (
      <ScoreTooltip explanation={explanation}>
        <div className="flex flex-col items-center">
          <div className="relative w-32 h-32 mb-2">
            <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
              <circle
                stroke="#f3f4f6"
                fill="transparent"
                strokeWidth={strokeWidth}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
              <circle
                stroke={color}
                fill="transparent"
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                style={{ strokeDashoffset }}
                strokeLinecap="round"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{score}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">/ 100</span>
            </div>
          </div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 text-center">{title}</h3>
        </div>
      </ScoreTooltip>
    )
  }

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
      gridLineWidth: 0
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
      categories: ['Last 7 Days', 'Last 30 Days'],
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
      gridLineWidth: 0
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
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-5 h-5 text-gray-400" />
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${scores?.currentValue?.toLocaleString() || domain.price.toLocaleString()}
                </span>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                Current Value
              </div>
              {scores?.projectedValue && (
                <>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                      ${scores.projectedValue.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    6M Projection ({scores.valueConfidence}% confidence)
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* AI Analysis Section */}
        {(analysis || isAnalyzing) && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  AI Investment Analysis
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Powered by DeepSeek AI
                </p>
              </div>
              {isAnalyzing && (
                <div className="ml-auto">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                </div>
              )}
            </div>

            {isAnalyzing ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto"></div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                    Analyzing domain characteristics and market potential...
                  </p>
                </div>
              </div>
            ) : analysis ? (
              <div className="space-y-6">
                {/* Investment Outlook Badge */}
                <div className="flex items-center gap-3">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                    analysis.investment_outlook === 'excellent' 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                      : analysis.investment_outlook === 'good'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                      : analysis.investment_outlook === 'fair'
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300'
                      : analysis.investment_outlook === 'high-risk'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300'
                  }`}>
                    {analysis.investment_outlook === 'excellent' && <CheckCircle className="w-4 h-4" />}
                    {analysis.investment_outlook === 'good' && <CheckCircle className="w-4 h-4" />}
                    {analysis.investment_outlook === 'fair' && <AlertTriangle className="w-4 h-4" />}
                    {analysis.investment_outlook === 'high-risk' && <XCircle className="w-4 h-4" />}
                    <span className="font-semibold text-sm uppercase tracking-wide">
                      {analysis.investment_outlook.replace('-', ' ')}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {analysis.confidence_level}% confidence
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {analysis.summary}
                  </p>
                </div>

                {/* Strengths & Risks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Strengths */}
                  <div>
                    <h3 className="flex items-center gap-2 font-semibold text-green-700 dark:text-green-300 mb-3">
                      <CheckCircle className="w-4 h-4" />
                      Key Strengths
                    </h3>
                    <ul className="space-y-2">
                      {analysis.key_strengths.map((strength, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0"></div>
                          <span className="text-gray-700 dark:text-gray-300">{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Risks */}
                  <div>
                    <h3 className="flex items-center gap-2 font-semibold text-red-700 dark:text-red-300 mb-3">
                      <AlertTriangle className="w-4 h-4" />
                      Key Risks
                    </h3>
                    <ul className="space-y-2">
                      {analysis.key_risks.map((risk, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0"></div>
                          <span className="text-gray-700 dark:text-gray-300">{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Recommendation */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Investment Recommendation
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    {analysis.recommendation}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        )}
        {/* Score Gauges */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Domain Scores
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <CircularProgress 
              score={scores.risk} 
              title="Risk Score" 
              color={scores.risk < 30 ? '#10b981' : scores.risk < 70 ? '#f59e0b' : '#ef4444'} 
              explanation={scoreExplanations.risk}
            />
            <CircularProgress 
              score={scores.rarity} 
              title="Rarity Score" 
              color="#3b82f6" 
              explanation={scoreExplanations.rarity}
            />
            <CircularProgress 
              score={scores.momentum} 
              title="Momentum" 
              color="#8b5cf6" 
              explanation={scoreExplanations.momentum}
            />
            <CircularProgress 
              score={scores.forecast} 
              title="6M Forecast" 
              color="#06b6d4" 
              explanation={scoreExplanations.forecast}
            />
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

        {/* Domain Alerts Section */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Active Alerts
            </h2>
            <button 
              onClick={() => setShowAlertModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Bell className="w-4 h-4" />
              New Alert
            </button>
          </div>
          
          {alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {alert.type === 'expiry' ? 'Expiry Alert' :
                         alert.type === 'risk' ? 'Risk Alert' :
                         alert.type === 'value' ? 'Value Alert' : 'Momentum Alert'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {alert.type === 'expiry' ? `Notify when < ${alert.threshold} days` :
                         alert.type === 'risk' ? `Notify when risk > ${alert.threshold}` :
                         alert.type === 'value' ? `Notify when value > $${alert.threshold.toLocaleString()}` :
                         `Notify when momentum > ${alert.threshold}`}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRemoveAlert(alert.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No alerts configured. Click "New Alert" to get notified about important changes.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-4 flex-wrap">
          <button 
            onClick={handleBuyDomain}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            Buy on Doma
          </button>
          <button 
            onClick={handleViewExplorer}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            View Explorer
          </button>
          <button 
            onClick={() => setShowAlertModal(true)}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Bell className="w-4 h-4" />
            Set Alert
          </button>
          <button 
            onClick={handleExport}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Data
          </button>
        </div>

        {/* Alert Modal */}
        {showAlertModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Create Alert for {domain.name}
                </h3>
                <button 
                  onClick={() => setShowAlertModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Alert Type
                  </label>
                  <select 
                    value={alertForm.type}
                    onChange={(e) => setAlertForm({...alertForm, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="expiry">Expiry Warning</option>
                    <option value="risk">Risk Threshold</option>
                    <option value="value">Value Threshold</option>
                    <option value="momentum">Momentum Change</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Threshold
                  </label>
                  <input 
                    type="number" 
                    value={alertForm.threshold}
                    onChange={(e) => setAlertForm({...alertForm, threshold: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder={alertForm.type === 'expiry' ? '30' : alertForm.type === 'value' ? '5000' : '70'}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {alertForm.type === 'expiry' ? 'Days until expiration' :
                     alertForm.type === 'risk' ? 'Risk score (0-100)' :
                     alertForm.type === 'value' ? 'Dollar amount' : 'Momentum score (0-100)'}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="alert-enabled"
                    checked={alertForm.enabled}
                    onChange={(e) => setAlertForm({...alertForm, enabled: e.target.checked})}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="alert-enabled" className="text-sm text-gray-700 dark:text-gray-300">
                    Enable notifications
                  </label>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={handleSaveAlert}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Create Alert
                </button>
                <button 
                  onClick={() => setShowAlertModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}