'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Shield, Clock, TrendingUp, AlertCircle, ExternalLink, DollarSign, Loader2, Info, Brain, CheckCircle, AlertTriangle, XCircle, Bell, Download, ShoppingCart, User, Star } from 'lucide-react'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import { ScoringEngine } from '@/lib/scoring'
import { domaClient } from '@/lib/doma-client'
import type { DomainModel } from '@/lib/doma-client'
import { aiValuationService, type DomainAnalysis } from '@/lib/ai-valuation'
import { trackDomain, untrackDomain, isTracked } from '@/lib/domain-tracking'

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
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [chartTimeframe, setChartTimeframe] = useState<'week' | 'month' | 'quarter' | 'ytd' | 'year'>('month')
  const [showForecast, setShowForecast] = useState(true)
  const [activityFilter, setActivityFilter] = useState<'all' | 'offers' | 'transfers' | 'listings' | 'renewals'>('all')
  const [activityTimeframe, setActivityTimeframe] = useState<'7d' | '30d' | '90d' | 'all'>('30d')
  const [activeOffers, setActiveOffers] = useState<any[]>([])
  const [realActivities, setRealActivities] = useState<any[]>([])
  const [realListings, setRealListings] = useState<any[]>([])
  const [tracked, setTracked] = useState(false)
  const [ownershipHistory, setOwnershipHistory] = useState<any>(null)
  const [holderBehavior, setHolderBehavior] = useState<any>(null)
  const [liquidityRisk, setLiquidityRisk] = useState<any>(null)

  // Generate historical and forecast data with proper predictive analytics
  const generateChartData = (timeframe: string, includeForecast: boolean = false) => {
    const now = Date.now()
    const data = []
    const forecastData = []
    
    // Base value from scores or default
    const currentPrice = scores?.currentValue || domain?.price || 5000
    
    // Calculate domain characteristics for trend analysis
    const domainAge = domain?.createdAt ? 
      Math.floor((now - new Date(domain.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 365
    const isShortDomain = domain?.namePart?.length <= 5
    const isPremiumTLD = ['com', 'ai', 'io'].includes(domain?.tld)
    const hasHighActivity = (domain?.activity30d || 0) > 20
    
    // Calculate growth factors based on domain characteristics
    const baseGrowthRate = 0.15 // 15% annual base growth for domains
    const lengthMultiplier = isShortDomain ? 1.5 : 1.0
    const tldMultiplier = isPremiumTLD ? 1.3 : 1.0
    const activityMultiplier = hasHighActivity ? 1.2 : 0.9
    const rarityMultiplier = scores?.rarity ? (1 + scores.rarity / 200) : 1.0
    
    // Calculate actual annual growth rate
    const annualGrowthRate = baseGrowthRate * lengthMultiplier * tldMultiplier * 
                             activityMultiplier * rarityMultiplier
    
    // Determine timeframe parameters
    let historicalDays = 30
    let forecastDays = 30
    let interval = 1
    
    switch (timeframe) {
      case 'week':
        historicalDays = 7
        forecastDays = 7
        interval = 1
        break
      case 'month':
        historicalDays = 30
        forecastDays = 30
        interval = 1
        break
      case 'quarter':
        historicalDays = 90
        forecastDays = 90
        interval = 3
        break
      case 'ytd':
        const startOfYear = new Date(new Date().getFullYear(), 0, 1)
        historicalDays = Math.floor((now - startOfYear.getTime()) / (1000 * 60 * 60 * 24))
        forecastDays = Math.min(180, 365 - historicalDays)
        interval = Math.floor(historicalDays / 60) || 1
        break
      case 'year':
        historicalDays = 365
        forecastDays = 365
        interval = 7
        break
    }
    
    // Generate historical data based on timeframe
    // Always show at least the requested timeframe, even for new domains
    const effectiveHistoricalDays = historicalDays
    
    // Calculate historical trend using exponential growth with volatility
    const dailyGrowth = Math.pow(1 + annualGrowthRate, 1/365) - 1
    
    // Generate historical data working backwards from current price
    const historicalPrices = []
    
    // Generate data points for each day/interval in the timeframe
    const numPoints = Math.floor(effectiveHistoricalDays / interval) + 1
    
    for (let i = numPoints - 1; i >= 0; i--) {
      const daysAgo = i * interval
      const date = new Date(now - daysAgo * 24 * 60 * 60 * 1000)
      
      // Calculate historical price by working backwards from current price
      const growthFactor = Math.pow(1 + dailyGrowth, daysAgo)
      const baseHistoricalPrice = currentPrice / growthFactor
      
      // Add realistic market volatility patterns
      // Use deterministic waves based on domain characteristics instead of random
      const domainSeed = domain?.namePart ? domain.namePart.length + domain.tld.length : 10
      const weeklyWave = Math.sin((effectiveHistoricalDays - daysAgo + domainSeed) * 2 * Math.PI / 7) * 0.02
      const monthlyWave = Math.sin((effectiveHistoricalDays - daysAgo + domainSeed) * 2 * Math.PI / 30) * 0.03
      // Use a deterministic "random" walk based on the day
      const pseudoRandom = Math.sin(daysAgo * 12.9898 + domainSeed * 78.233) * 43758.5453
      const randomWalk = (pseudoRandom - Math.floor(pseudoRandom) - 0.5) * 0.01
      
      const volatilityMultiplier = 1 + weeklyWave + monthlyWave + randomWalk
      const historicalPrice = baseHistoricalPrice * volatilityMultiplier
      
      historicalPrices.push([date.getTime(), Math.round(Math.max(100, historicalPrice))])
    }
    
    // Ensure we have at least some data points
    if (historicalPrices.length === 0) {
      historicalPrices.push([now, currentPrice])
    }
    
    // Ensure the last historical point matches current price exactly
    if (historicalPrices.length > 0) {
      historicalPrices[historicalPrices.length - 1][1] = currentPrice
    }
    
    // Generate forecast data starting from current price
    const forecastUpperBound = []
    const forecastLowerBound = []
    let sixMonthValue = currentPrice // Track 6-month value for consistency
    
    if (includeForecast && forecastDays > 0) {
      // Start forecast from today
      forecastData.push([now, currentPrice])
      forecastUpperBound.push([now, currentPrice])
      forecastLowerBound.push([now, currentPrice])
      
      // Apply predictive model with decreasing confidence over time
      let forecastValue = currentPrice
      let upperValue = currentPrice
      let lowerValue = currentPrice
      
      for (let i = 1; i <= Math.floor(forecastDays / interval); i++) {
        const date = new Date(now + i * interval * 24 * 60 * 60 * 1000)
        const daysInFuture = i * interval
        
        // Apply growth with momentum factor
        const momentumBoost = scores?.momentum ? (scores.momentum - 50) / 500 : 0 // -10% to +10% based on momentum
        const effectiveGrowth = dailyGrowth + momentumBoost / 365
        
        // Calculate forecast value with compound growth
        forecastValue = forecastValue * Math.pow(1 + effectiveGrowth, interval)
        
        // Store 6-month value when we reach 180 days
        if (daysInFuture <= 180 && (daysInFuture + interval) > 180) {
          // Interpolate to get exact 180-day value
          const daysToSixMonths = 180 - daysInFuture
          sixMonthValue = forecastValue * Math.pow(1 + effectiveGrowth, daysToSixMonths / interval)
        }
        
        // Calculate confidence interval (60% confidence at 6 months)
        // Confidence decreases from 95% at day 1 to 60% at 180 days, then further
        const confidenceLevel = daysInFuture <= 180 
          ? 0.95 - (0.35 * daysInFuture / 180)  // Linear decrease from 95% to 60%
          : 0.60 - (0.30 * (daysInFuture - 180) / 180) // Further decrease after 6 months
        
        // Width for confidence bounds based on confidence level
        const confidenceWidth = (1 - confidenceLevel) / 2
        
        // Calculate confidence bounds
        upperValue = forecastValue * (1 + confidenceWidth)
        lowerValue = forecastValue * (1 - confidenceWidth)
        
        forecastData.push([date.getTime(), Math.round(Math.max(100, forecastValue))])
        forecastUpperBound.push([date.getTime(), Math.round(Math.max(100, upperValue))])
        forecastLowerBound.push([date.getTime(), Math.round(Math.max(100, lowerValue))])
      }
      
      // If we didn't reach 180 days in the loop, calculate it
      if (forecastDays < 180) {
        const daysToSixMonths = 180
        sixMonthValue = currentPrice * Math.pow(1 + dailyGrowth + (scores?.momentum ? (scores.momentum - 50) / 500 / 365 : 0), daysToSixMonths)
      }
    } else {
      // Even without forecast display, calculate 6-month value for consistency
      const daysToSixMonths = 180
      const momentumBoost = scores?.momentum ? (scores.momentum - 50) / 500 : 0
      const effectiveGrowth = dailyGrowth + momentumBoost / 365
      sixMonthValue = currentPrice * Math.pow(1 + effectiveGrowth, daysToSixMonths)
    }
    
    return { 
      historical: historicalPrices, 
      forecast: forecastData,
      upperBound: forecastUpperBound,
      lowerBound: forecastLowerBound,
      sixMonthProjection: Math.round(Math.max(100, sixMonthValue)),
      sixMonthConfidence: 60 // Fixed 60% confidence at 6 months
    }
  }

  // Generate comprehensive activity data (fallback for when real data is not available)
  const getActivityData = () => {
    const activities = []

    // Add real activities
    if (realActivities && realActivities.length > 0) {
      console.log('📊 Processing real activities:', realActivities.length)
      activities.push(...realActivities.map(activity => {
      const timestamp = new Date(activity.createdAt)
      let title = ''
      let description = ''
      let value = null
      let status = 'completed'
      const details: any = {
        txHash: activity.txHash
      }
      
      // Map activity types to our format
      switch (activity.type) {
        case 'MINTED':
          title = 'Domain Tokenized'
          description = `Minted to ${activity.mintedTo?.slice(0, 6)}...${activity.mintedTo?.slice(-4)}`
          details.tokenId = activity.tokenId
          status = 'success'
          break
          
        case 'TRANSFERRED':
          title = 'Domain Transferred'
          description = `From ${activity.transferredFrom?.slice(0, 6)}...${activity.transferredFrom?.slice(-4)} to ${activity.transferredTo?.slice(0, 6)}...${activity.transferredTo?.slice(-4)}`
          status = 'success'
          break
          
        case 'LISTED':
          title = 'Listed for Sale'
          const listingPrice = activity.payment?.price
          const currency = activity.payment?.currencySymbol || 'ETH'
          const listingUsdRate = activity.payment?.usdExchangeRate || 0
          const listingUsdValue = listingPrice && listingUsdRate ? (parseFloat(listingPrice) * listingUsdRate).toFixed(2) : null
          description = listingUsdValue
            ? `Listed for ${listingPrice} ${currency} ($${parseFloat(listingUsdValue).toLocaleString()})`
            : `Listed for ${listingPrice} ${currency}`
          value = listingUsdValue ? parseFloat(listingUsdValue) : null
          details.orderId = activity.orderId
          details.seller = activity.seller
          details.price = listingPrice
          details.currency = currency
          break
          
        case 'OFFER_RECEIVED':
          title = 'Offer Received'
          const offerPrice = activity.payment?.price
          const offerCurrency = activity.payment?.currencySymbol || 'ETH'
          const offerUsdRate = activity.payment?.usdExchangeRate || 0
          const offerUsdValue = offerPrice && offerUsdRate ? (parseFloat(offerPrice) * offerUsdRate).toFixed(2) : null
          description = offerUsdValue
            ? `Offer of ${offerPrice} ${offerCurrency} ($${parseFloat(offerUsdValue).toLocaleString()}) from ${activity.buyer?.slice(0, 6)}...${activity.buyer?.slice(-4)}`
            : `Offer of ${offerPrice} ${offerCurrency} from ${activity.buyer?.slice(0, 6)}...${activity.buyer?.slice(-4)}`
          value = offerUsdValue ? parseFloat(offerUsdValue) : null
          details.buyer = activity.buyer
          details.seller = activity.seller
          details.price = offerPrice
          details.currency = offerCurrency
          break
          
        case 'PURCHASED':
          title = 'Domain Sold'
          const salePrice = activity.payment?.price
          const saleCurrency = activity.payment?.currencySymbol || 'ETH'
          const saleUsdRate = activity.payment?.usdExchangeRate || 0
          const saleUsdValue = salePrice && saleUsdRate ? (parseFloat(salePrice) * saleUsdRate).toFixed(2) : null
          description = saleUsdValue
            ? `Sold for ${salePrice} ${saleCurrency} ($${parseFloat(saleUsdValue).toLocaleString()}) - Buyer: ${activity.buyer?.slice(0, 6)}...${activity.buyer?.slice(-4)}`
            : `Sold for ${salePrice} ${saleCurrency} - Buyer: ${activity.buyer?.slice(0, 6)}...${activity.buyer?.slice(-4)}`
          value = saleUsdValue ? parseFloat(saleUsdValue) : null
          details.buyer = activity.buyer
          details.seller = activity.seller
          details.price = salePrice
          details.currency = saleCurrency
          status = 'success'
          break
          
        case 'RENEWED':
          title = 'Domain Renewed'
          description = `Extended until ${new Date(activity.newExpiryDate).toLocaleDateString()}`
          status = 'success'
          break
          
        case 'BURNED':
          title = 'Domain Burned'
          description = 'Token has been burned'
          status = 'expired'
          break
          
        default:
          title = activity.type
          description = 'Domain activity recorded'
      }
      
      return {
        id: `activity-${activity.txHash}`,
        type: activity.type.toLowerCase(),
        title,
        description,
        timestamp,
        details,
        value,
        status
      }
    }))
    }
    
    // Add active offers as activities
    if (activeOffers && activeOffers.length > 0) {
      console.log('💰 Adding offers as activities:', activeOffers.length)
      activities.push(...activeOffers.map(offer => ({
        id: `offer-${offer.id}`,
        type: 'offer_placed',
        title: 'Offer Placed',
        description: `${offer.from?.slice(0, 6)}...${offer.from?.slice(-4)} offered $${offer.amount.toLocaleString()}`,
        timestamp: offer.timestamp,
        details: {
          from: offer.from,
          amount: offer.amount,
          currency: offer.currency
        },
        value: offer.amount,
        status: offer.status || 'active'
      })))
    }

    // Sort by timestamp (most recent first)
    const sorted = activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    console.log('📋 Total activities after sorting:', sorted.length)
    return sorted
  }

  useEffect(() => {
    fetchDomainData()
  }, [params.id])

  // Fetch real activity data when domain is loaded
  useEffect(() => {
    if (domain?.tokenId && domain?.ownerAddress) {
      fetchRealActivities(domain.tokenId)
      fetchRealOffers(domain.tokenId)
      fetchRealListings(domain.tokenId)
      // Check if domain is tracked
      setTracked(isTracked(domain.tokenId))

      // Fetch ownership and liquidity analysis
      fetchOwnershipAnalysis(domain.tokenId, domain.ownerAddress)
    }
  }, [domain?.tokenId, domain?.ownerAddress])

  const fetchOwnershipAnalysis = async (tokenId: string, ownerAddress: string) => {
    try {
      const [ownership, holder, liquidity] = await Promise.all([
        domaClient.analyzeOwnershipHistory(tokenId),
        domaClient.analyzeHolderBehavior(ownerAddress),
        domaClient.calculateLiquidityRisk(tokenId)
      ])

      setOwnershipHistory(ownership)
      setHolderBehavior(holder)
      setLiquidityRisk(liquidity)

      console.log('📊 Ownership Analysis:', ownership)
      console.log('👤 Holder Behavior:', holder)
      console.log('💧 Liquidity Risk:', liquidity)
    } catch (error) {
      console.error('Error fetching ownership analysis:', error)
    }
  }

  // Toggle domain tracking for alerts
  const handleToggleTracking = () => {
    if (!domain) return

    if (tracked) {
      untrackDomain(domain.tokenId)
      setTracked(false)
    } else {
      trackDomain(domain.tokenId, domain.name)
      setTracked(true)
    }
  }

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showExportMenu && !(e.target as Element).closest('.export-menu-container')) {
        setShowExportMenu(false)
      }
    }
    
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showExportMenu])

  // Fetch real activities from testnet
  const fetchRealActivities = async (tokenId: string) => {
    try {
      console.log('Fetching activities for token:', tokenId)
      const activities = await domaClient.getTokenActivities(tokenId, 50)
      console.log('✅ Fetched real activities:', activities?.length || 0, 'items')
      if (activities && activities.length > 0) {
        console.log('Sample activity:', activities[0])
      }
      setRealActivities(activities || [])
    } catch (error) {
      console.error('❌ Error fetching real activities:', error)
      setRealActivities([])
    }
  }

  // Fetch real offers from testnet
  const fetchRealOffers = async (tokenId: string) => {
    try {
      const offers = await domaClient.getTokenOffers(tokenId, 20)
      console.log('Fetched offers from API:', offers)
      
      if (offers && offers.length > 0) {
        const mappedOffers = offers.map(offer => ({
          id: offer.id || offer.externalId || `offer-${Date.now()}-${Math.random()}`,
          amount: parseFloat(offer.price) * (offer.currency?.usdExchangeRate || 1),
          from: offer.offererAddress,
          timestamp: new Date(offer.createdAt),
          status: 'active',
          currency: offer.currency
        }))
        console.log('Mapped offers:', mappedOffers)
        setActiveOffers(mappedOffers)
      } else {
        // No offers from API - set empty array
        console.log('No offers from API')
        setActiveOffers([])
      }
    } catch (error) {
      console.error('Error fetching real offers:', error)
      // On error, set empty array - no mock data
      setActiveOffers([])
    }
  }

  // Fetch real listings from testnet
  const fetchRealListings = async (tokenId: string) => {
    try {
      const listings = await domaClient.getTokenListings(tokenId, 20)
      setRealListings(listings)
    } catch (error) {
      console.error('Error fetching real listings:', error)
    }
  }

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
          tokenizedAt: domainData.createdAt,
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

            // Fetch REAL contract data
            let expiresAt = new Date(token.expiresAt)
            let lockStatus = foundToken.transferLock || false
            let registrarId = foundToken.registrar?.ianaId ? parseInt(foundToken.registrar.ianaId) : 1

            try {
              const contractData = await domaClient.getTokenRiskData(token.tokenAddress, [tokenId])
              const realData = contractData[tokenId]

              if (realData) {
                expiresAt = new Date(Number(realData.expirationOf) * 1000)
                lockStatus = realData.lockStatusOf
                registrarId = Number(realData.registrarOf)
              }
            } catch (err) {
              console.error('Failed to fetch contract data for detail page:', err)
            }

            // Market activity data - use minimal API calls to avoid errors
            let activity7d = 0
            let activity30d = 0
            let offerCount = 0
            const renewalCount = 0

            // Use domain characteristics as proxy for activity
            const isPopularTLD = ['com', 'xyz', 'io', 'ai'].includes(tld)
            const isShortName = namePart.length <= 6
            const baseSeed = namePart.charCodeAt(0) % 10

            // Estimate activity based on domain quality
            if (isPopularTLD && isShortName) {
              activity7d = 5 + baseSeed
              activity30d = 15 + (baseSeed * 2)
              offerCount = 2 + (baseSeed % 5)
            } else if (isPopularTLD || isShortName) {
              activity7d = 2 + (baseSeed % 5)
              activity30d = 8 + (baseSeed % 10)
              offerCount = baseSeed % 3
            } else {
              activity7d = baseSeed % 3
              activity30d = (baseSeed % 5) + 2
              offerCount = 0
            }

            const domainData = {
              id: tokenId,
              name: foundToken.name,
              namePart,
              tld,
              tokenId,
              tokenAddress: token.tokenAddress,
              owner: token.ownerAddress,
              expiresAt,
              explorerUrl: token.explorerUrl,
              registrar: foundToken.registrar?.name || 'Unknown',
              transferLock: lockStatus,
              lockStatus,
              registrarId,
              renewalCount,
              offerCount,
              activity7d,
              activity30d,
              price: 1000, // Will be updated by AI valuation
              createdAt: foundToken.tokenizedAt ? new Date(foundToken.tokenizedAt) : new Date(),
            }

            setDomain(domainData)

            // Use sync scoring for consistency with landing page
            const calculatedScores = scoringEngine.calculateScoresSync({
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

            // Update price with calculated value
            domainData.price = Math.round(calculatedScores.currentValue || 1000)

            setScores(calculatedScores)

            // Optionally get AI analysis in background (doesn't affect price)
            generateAnalysis(domainData, calculatedScores)
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
  const handleExport = (format: 'json' | 'text' | 'csv') => {
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

    let dataStr = ''
    let mimeType = ''
    let fileExtension = ''

    switch (format) {
      case 'json':
        dataStr = JSON.stringify(exportData, null, 2)
        mimeType = 'application/json'
        fileExtension = 'json'
        break
      
      case 'text':
        dataStr = `Domain Analysis Report
========================
Domain: ${domain.name}
Token ID: ${domain.tokenId}
Owner: ${domain.owner}
Expires: ${domain.expiresAt.toLocaleDateString()}
Registrar: ${domain.registrar}
Lock Status: ${domain.lockStatus ? 'Locked' : 'Unlocked'}

Scores
------
Risk Score: ${scores?.risk || 'N/A'}
Rarity Score: ${scores?.rarity || 'N/A'}
Momentum Score: ${scores?.momentum || 'N/A'}
Forecast Score: ${scores?.forecast || 'N/A'}
Current Value: $${scores?.currentValue?.toLocaleString() || 'N/A'}
Projected Value: $${scores?.projectedValue?.toLocaleString() || 'N/A'}
Value Confidence: ${scores?.valueConfidence || 'N/A'}%

Market Data
-----------
7-Day Activity: ${domain.activity7d || 0}
30-Day Activity: ${domain.activity30d || 0}
Offer Count: ${domain.offerCount || 0}
Renewal Count: ${domain.renewalCount || 0}
Price: $${domain.price?.toLocaleString() || 'N/A'}

${analysis ? `AI Analysis
-----------
Investment Outlook: ${analysis.investment_outlook}
Summary: ${analysis.summary}
Recommendation: ${analysis.recommendation}
Confidence: ${analysis.confidence_level}%

Key Strengths:
${analysis.key_strengths.map(s => `- ${s}`).join('\n')}

Key Risks:
${analysis.key_risks.map(r => `- ${r}`).join('\n')}` : ''}

Exported: ${new Date().toLocaleString()}
`
        mimeType = 'text/plain'
        fileExtension = 'txt'
        break
      
      case 'csv':
        // Create CSV with flattened data
        const csvRows = [
          ['Field', 'Value'],
          ['Domain Name', domain.name],
          ['Token ID', domain.tokenId],
          ['Owner', domain.owner],
          ['Expires', domain.expiresAt.toLocaleDateString()],
          ['Registrar', domain.registrar],
          ['Lock Status', domain.lockStatus ? 'Locked' : 'Unlocked'],
          ['Risk Score', scores?.risk || ''],
          ['Rarity Score', scores?.rarity || ''],
          ['Momentum Score', scores?.momentum || ''],
          ['Forecast Score', scores?.forecast || ''],
          ['Current Value', scores?.currentValue || ''],
          ['Projected Value', scores?.projectedValue || ''],
          ['Value Confidence', scores?.valueConfidence || ''],
          ['7-Day Activity', domain.activity7d || 0],
          ['30-Day Activity', domain.activity30d || 0],
          ['Offer Count', domain.offerCount || 0],
          ['Renewal Count', domain.renewalCount || 0],
          ['Price', domain.price || ''],
          ['Investment Outlook', analysis?.investment_outlook || ''],
          ['AI Confidence', analysis?.confidence_level || ''],
          ['Export Date', new Date().toLocaleDateString()],
          ['Export Time', new Date().toLocaleTimeString()]
        ]
        
        dataStr = csvRows.map(row => row.map(cell => 
          typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
        ).join(',')).join('\n')
        
        mimeType = 'text/csv'
        fileExtension = 'csv'
        break
    }

    const dataBlob = new Blob([dataStr], { type: mimeType })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${domain.name.replace('.', '_')}_analysis.${fileExtension}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setShowExportMenu(false)
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
        <div className="flex flex-col items-center px-2 sm:px-0">
          <div className="relative w-24 h-24 sm:w-32 sm:h-32 mb-2">
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
              <span className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{score}</span>
              <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">/ 100</span>
            </div>
          </div>
          <h3 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 text-center px-1">{title}</h3>
        </div>
      </ScoreTooltip>
    )
  }

  // Generate chart data with historical and forecast
  const chartData = generateChartData(chartTimeframe, showForecast)
  
  // Beautiful area chart for value trend with forecast
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
      gridLineWidth: 0,
      plotLines: showForecast ? [{
        color: '#e5e7eb',
        width: 1,
        value: Date.now(),
        dashStyle: 'dash',
        label: {
          text: 'Today',
          style: {
            color: '#6b7280',
            fontSize: '10px'
          },
          rotation: 0,
          y: -8,
          x: -20,
          align: 'center'
        }
      }] : []
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
      enabled: showForecast,
      align: 'center',
      verticalAlign: 'bottom',
      itemStyle: {
        color: '#6b7280',
        fontSize: '11px'
      }
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
        const label = this.series.name === 'Forecast' ? ' (Projected)' : ''
        return `<b>${Highcharts.dateFormat('%b %e, %Y', this.x)}</b><br/>${this.series.name}: <b>$${this.y.toLocaleString()}</b>${label}`
      },
      useHTML: true,
      shared: false
    },
    plotOptions: {
      area: {
        marker: {
          enabled: false,
          symbol: 'circle',
          radius: 3,
          states: {
            hover: {
              enabled: true,
              lineWidth: 2
            }
          }
        },
        lineWidth: 2,
        states: {
          hover: {
            lineWidth: 2
          }
        },
        threshold: null
      },
      line: {
        marker: {
          enabled: false
        },
        lineWidth: 2
      }
    },
    series: [
      {
        name: 'Historical Price',
        type: 'area',
        data: chartData.historical,
        turboThreshold: 0,
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, 'rgba(59, 130, 246, 0.3)'],
            [1, 'rgba(59, 130, 246, 0.05)']
          ]
        },
        lineColor: '#3b82f6',
        lineWidth: 2,
        marker: {
          enabled: false,
          radius: 3,
          states: {
            hover: {
              enabled: true,
              radius: 5
            }
          }
        },
        zIndex: 2
      },
      // Add today's value marker
      {
        name: 'Current Value',
        type: 'scatter',
        data: chartData.historical.length > 0 ? [[chartData.historical[chartData.historical.length - 1][0], chartData.historical[chartData.historical.length - 1][1]]] : [],
        color: '#10b981',
        marker: {
          enabled: true,
          symbol: 'circle',
          radius: 8,
          lineWidth: 3,
          lineColor: '#ffffff',
          states: {
            hover: {
              radius: 10
            }
          }
        },
        tooltip: {
          pointFormat: '<b>Today:</b> ${point.y:,.0f}'
        },
        zIndex: 5
      },
      ...(showForecast && chartData.forecast.length > 0 ? [
        {
          name: 'Predicted Value',
          type: 'line',
          data: chartData.forecast,
          turboThreshold: 0,
          dashStyle: 'ShortDot',
          lineColor: '#8b5cf6',
          color: '#8b5cf6',
          lineWidth: 3,
          marker: {
            enabled: false
          },
          tooltip: {
            pointFormat: '<b>Forecast:</b> ${point.y:,.0f}'
          },
          zIndex: 3
        },
        {
          name: 'Upper Confidence',
          type: 'line',
          data: chartData.upperBound || [],
          turboThreshold: 0,
          dashStyle: 'Dot',
          lineColor: 'rgba(139, 92, 246, 0.4)',
          color: 'rgba(139, 92, 246, 0.4)',
          lineWidth: 1,
          zIndex: 1,
          enableMouseTracking: false,
          showInLegend: false
        },
        {
          name: 'Lower Confidence',
          type: 'line',
          data: chartData.lowerBound || [],
          turboThreshold: 0,
          dashStyle: 'Dot',
          lineColor: 'rgba(139, 92, 246, 0.4)',
          color: 'rgba(139, 92, 246, 0.4)',
          lineWidth: 1,
          zIndex: 1,
          enableMouseTracking: false,
          showInLegend: false
        }
      ] : [])
    ],
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 sm:h-16 gap-3 sm:gap-0">
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
        <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white break-all">
                  {domain.name}
                </h1>
                {domain.lockStatus && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 rounded-md">
                    <Shield className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
                    <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300">Locked</span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
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
            <div className="text-left sm:text-right w-full sm:w-auto">
              <div className="flex items-center gap-2 mb-1 justify-start sm:justify-end">
                <DollarSign className="w-5 h-5 text-gray-400" />
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${scores?.currentValue?.toLocaleString() || domain.price.toLocaleString()}
                </span>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                Current Value
              </div>
              {chartData?.sixMonthProjection && (
                <>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                      ${chartData.sixMonthProjection.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    6M Projection ({chartData.sixMonthConfidence || 60}% confidence)
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
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
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
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6">
            <span className="hidden sm:inline">Domain </span>Scores
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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

        {/* Value Trend & Activity Timeline - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Value Trend Chart */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  Value Trend & Forecast
                </h2>
                {showForecast && chartData.sixMonthProjection && (
                  <div className="flex items-center gap-4 mt-2 text-xs">
                    <span className="text-gray-500 dark:text-gray-400">
                      Projected:
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">
                      30d: <strong className="text-green-600 dark:text-green-400">
                        ${chartData.forecast.length > 10 ? Math.round(chartData.forecast[Math.min(10, chartData.forecast.length - 1)][1]).toLocaleString() : 'N/A'}
                      </strong>
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">
                      6m: <strong className="text-cyan-600 dark:text-cyan-400">
                        ${chartData.sixMonthProjection.toLocaleString()}
                      </strong>
                      <span className="text-gray-500 ml-1">({chartData.sixMonthConfidence}% conf)</span>
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">
                      1yr: <strong className="text-purple-600 dark:text-purple-400">
                        ${chartData.forecast.length > 50 ? Math.round(chartData.forecast[Math.min(50, chartData.forecast.length - 1)][1]).toLocaleString() : 'N/A'}
                      </strong>
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Timeframe Selector */}
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                  <button
                    onClick={() => setChartTimeframe('week')}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                      chartTimeframe === 'week'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    1W
                  </button>
                  <button
                    onClick={() => setChartTimeframe('month')}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                      chartTimeframe === 'month'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    1M
                  </button>
                  <button
                    onClick={() => setChartTimeframe('quarter')}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                      chartTimeframe === 'quarter'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    3M
                  </button>
                  <button
                    onClick={() => setChartTimeframe('ytd')}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                      chartTimeframe === 'ytd'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    YTD
                  </button>
                  <button
                    onClick={() => setChartTimeframe('year')}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                      chartTimeframe === 'year'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    1Y
                  </button>
                </div>

                {/* Forecast Toggle */}
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                  <button
                    onClick={() => setShowForecast(!showForecast)}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer flex items-center gap-1 ${
                      showForecast
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <span>{showForecast ? '📈' : '📊'}</span>
                    <span>Forecast</span>
                  </button>
                </div>
              </div>
            </div>
            <HighchartsReact highcharts={Highcharts} options={trendChartOptions} />
          </div>

          {/* Activity Timeline - Moved next to Value Trend */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6">
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex items-center gap-2 group">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  Activity Timeline
                </h2>
                <div className="relative">
                  <Info
                    className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help"
                    onMouseEnter={(e) => {
                      const tooltip = e.currentTarget.nextElementSibling as HTMLElement
                      if (tooltip) tooltip.style.display = 'block'
                    }}
                    onMouseLeave={(e) => {
                      const tooltip = e.currentTarget.nextElementSibling as HTMLElement
                      if (tooltip) tooltip.style.display = 'none'
                    }}
                  />
                  <div
                    className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-50 pointer-events-none hidden"
                    style={{ width: 'max-content', maxWidth: '300px' }}
                  >
                    <div className="font-semibold mb-1">Tracked Activities:</div>
                    <div className="space-y-0.5 text-gray-300">
                      <div>💰 Offers - Placed, accepted, cancelled</div>
                      <div>🏷️ Listings - Created, updated, removed</div>
                      <div>✅ Purchases - Domain sales & transfers</div>
                      <div>🔄 Transfers - Ownership changes</div>
                      <div>🎨 Minting - Domain tokenization</div>
                      <div>⏰ Renewals - Registration extensions</div>
                    </div>
                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-800"></div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
                {/* Activity Filter */}
                <select
                  value={activityFilter}
                  onChange={(e) => setActivityFilter(e.target.value as any)}
                  className="w-full sm:flex-1 min-w-0 px-2 sm:px-3 py-1.5 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none"
                >
                  <option value="all">All Activities</option>
                  <option value="offers">Offers</option>
                  <option value="transfers">Transfers</option>
                  <option value="listings">Listings</option>
                  <option value="renewals">Renewals</option>
                </select>

                {/* Timeframe Filter */}
                <select
                  value={activityTimeframe}
                  onChange={(e) => setActivityTimeframe(e.target.value as any)}
                  className="w-full sm:flex-1 min-w-0 px-2 sm:px-3 py-1.5 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="all">All time</option>
                </select>
              </div>
            </div>

            {/* Activity Feed - Compact version */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {(() => {
                const activities = getActivityData()
                const now = Date.now()

                // Filter activities by type
                let filteredActivities = activities
                if (activityFilter !== 'all') {
                  const filterMap: any = {
                    'offers': ['offer_placed', 'offer_received', 'offer_accepted', 'offer_rejected', 'offer_expired', 'offer_cancelled'],
                    'transfers': ['transfer', 'transferred'],
                    'listings': ['listed', 'listing_created', 'listing_updated', 'listing_removed', 'listing_cancelled'],
                    'renewals': ['renewed', 'renewal']
                  }
                  filteredActivities = activities.filter(a => filterMap[activityFilter]?.includes(a.type))
                }

                // Filter by timeframe
                if (activityTimeframe !== 'all') {
                  const daysMap: any = { '7d': 7, '30d': 30, '90d': 90 }
                  const days = daysMap[activityTimeframe]
                  filteredActivities = filteredActivities.filter(a =>
                    a.timestamp.getTime() > now - days * 24 * 60 * 60 * 1000
                  )
                }

                if (filteredActivities.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                      No activities found for the selected filters
                    </div>
                  )
                }

                return filteredActivities.slice(0, 10).map((activity) => {
                  // Determine icon
                  let icon = '📋'
                  if (activity.type.includes('offer')) icon = '💰'
                  else if (activity.type === 'transferred' || activity.type === 'transfer') icon = '🔄'
                  else if (activity.type.includes('listing') || activity.type === 'listed') icon = '🏷️'
                  else if (activity.type === 'purchased') icon = '✅'
                  else if (activity.type === 'renewed' || activity.type === 'renewal') icon = '⏰'
                  else if (activity.type === 'minted' || activity.type === 'tokenized') icon = '🎨'

                  // Format timestamp
                  const timeDiff = now - activity.timestamp.getTime()
                  let timeAgo = ''
                  if (timeDiff < 60 * 60 * 1000) timeAgo = `${Math.floor(timeDiff / (60 * 1000))}m ago`
                  else if (timeDiff < 24 * 60 * 60 * 1000) timeAgo = `${Math.floor(timeDiff / (60 * 60 * 1000))}h ago`
                  else if (timeDiff < 30 * 24 * 60 * 60 * 1000) timeAgo = `${Math.floor(timeDiff / (24 * 60 * 60 * 1000))}d ago`
                  else timeAgo = activity.timestamp.toLocaleDateString()

                  return (
                    <div key={activity.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-sm">
                      <span className="text-lg flex-shrink-0">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate">{activity.title}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 truncate">{activity.description}</div>
                      </div>
                      {activity.value && (
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            ${activity.value.toLocaleString()}
                          </div>
                        </div>
                      )}
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 w-16 text-right">
                        {timeAgo}
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </div>
        </div>

        {/* Ownership & Liquidity Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ownership History */}
            {ownershipHistory && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Ownership History
                </h2>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Total Transfers</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {ownershipHistory.totalTransfers}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Unique Owners</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {ownershipHistory.uniqueOwners}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Avg. Holding Period</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {ownershipHistory.averageHoldingDays} days
                    </div>
                  </div>

                  {ownershipHistory.isFrequentlyTraded && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-yellow-900 dark:text-yellow-100">Frequently Traded</div>
                        <div className="text-sm text-yellow-700 dark:text-yellow-300">
                          This domain changes hands often, which may indicate speculative trading
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Holder Behavior Analysis */}
            {holderBehavior && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Current Holder Profile
                </h2>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Holder Type</div>
                      <div className="text-xl font-bold text-gray-900 dark:text-white capitalize">
                        {holderBehavior.holderType}
                      </div>
                    </div>
                    <div className="text-4xl">
                      {holderBehavior.holderType === 'collector' ? '🎨' :
                       holderBehavior.holderType === 'trader' ? '📈' :
                       holderBehavior.holderType === 'flipper' ? '🔄' : '💎'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Portfolio Size</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {holderBehavior.portfolioSize}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Active Listings</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {holderBehavior.activeListings}
                      </div>
                    </div>
                  </div>

                  <div className={`border rounded-lg p-3 ${
                    holderBehavior.sellLikelihood === 'high'
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                      : holderBehavior.sellLikelihood === 'medium'
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                      : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  }`}>
                    <div className="text-sm font-medium mb-1">
                      Sell Likelihood: <span className="capitalize">{holderBehavior.sellLikelihood}</span>
                    </div>
                    <div className="text-xs opacity-75">
                      {holderBehavior.holderType === 'flipper' && 'Active flipper - likely to sell quickly'}
                      {holderBehavior.holderType === 'trader' && 'Active trader - may list for sale'}
                      {holderBehavior.holderType === 'collector' && 'Long-term collector - unlikely to sell'}
                      {holderBehavior.holderType === 'holder' && 'Passive holder - moderate sell risk'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Liquidity & Market Depth */}
          {liquidityRisk && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Liquidity & Market Depth Analysis
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Liquidity Score */}
                <div>
                  <div className="text-center mb-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Liquidity Score</div>
                    <div className={`text-5xl font-bold ${
                      liquidityRisk.riskLevel === 'low' ? 'text-green-600 dark:text-green-400' :
                      liquidityRisk.riskLevel === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {liquidityRisk.score}
                    </div>
                    <div className={`text-sm font-medium mt-1 ${
                      liquidityRisk.riskLevel === 'low' ? 'text-green-700 dark:text-green-300' :
                      liquidityRisk.riskLevel === 'medium' ? 'text-yellow-700 dark:text-yellow-300' :
                      'text-red-700 dark:text-red-300'
                    }`}>
                      {liquidityRisk.riskLevel === 'low' ? 'High Liquidity' :
                       liquidityRisk.riskLevel === 'medium' ? 'Moderate Liquidity' :
                       'Low Liquidity'}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Active Offers</span>
                      <span className="font-medium text-gray-900 dark:text-white">{liquidityRisk.activeOffers}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Active Listings</span>
                      <span className="font-medium text-gray-900 dark:text-white">{liquidityRisk.activeListings}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Sales (30d)</span>
                      <span className="font-medium text-gray-900 dark:text-white">{liquidityRisk.recentSales}</span>
                    </div>
                    {liquidityRisk.bidAskSpread !== null && (
                      <div className="flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-gray-600 dark:text-gray-400">Bid-Ask Spread</span>
                        <span className="font-medium text-gray-900 dark:text-white">{liquidityRisk.bidAskSpread}%</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Market Depth Pie Chart */}
                {liquidityRisk.hasMarketDepth && (
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">Market Depth Distribution</div>
                    <div className="aspect-square max-w-[250px] mx-auto">
                      {/* Placeholder for pie chart - would use Highcharts */}
                      <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center">
                        <div className="text-white text-center">
                          <div className="text-3xl font-bold">{liquidityRisk.activeOffers + liquidityRisk.activeListings}</div>
                          <div className="text-sm">Active Orders</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!liquidityRisk.hasMarketDepth && (
                  <div className="flex items-center justify-center">
                    <div className="text-center text-gray-500 dark:text-gray-400">
                      <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <div className="text-sm">Insufficient market depth data</div>
                      <div className="text-xs mt-1">No active offers or listings</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}


        {/* Domain Alerts Section */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6 mt-8">
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
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 cursor-pointer"
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
          <div className="relative group">
            <button
              onClick={handleToggleTracking}
              className={`px-6 py-3 border rounded-lg font-medium transition-colors flex items-center gap-2 ${
                tracked
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <Star className={`w-4 h-4 ${tracked ? 'fill-current' : ''}`} />
              {tracked ? 'Tracking for Alerts' : 'Track for Alerts'}
            </button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-lg whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
              {tracked
                ? '✅ You\'ll get alerts when new offers are made'
                : '🔔 Get notified when someone makes an offer'}
              <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-800"></div>
            </div>
          </div>
          <div className="relative export-menu-container">
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export Data
            </button>
            {showExportMenu && (
              <div className="absolute top-full mt-2 right-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-2 min-w-[150px] z-10">
                <button
                  onClick={() => handleExport('json')}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Export as JSON
                </button>
                <button
                  onClick={() => handleExport('text')}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Export as Text
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Export as CSV
                </button>
              </div>
            )}
          </div>
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
      
      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.5);
          border-radius: 3px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(156, 163, 175, 0.7);
        }
        
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(75, 85, 99, 0.5);
        }
        
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(75, 85, 99, 0.7);
        }
      `}</style>
    </div>
  )
}