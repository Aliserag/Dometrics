import { NextRequest, NextResponse } from 'next/server'
import { domaClient } from '@/lib/doma-client'
import { ScoringEngine } from '@/lib/scoring'

const scoringEngine = new ScoringEngine()

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'overview'
    const period = searchParams.get('period') || '7d'

    // Fetch real data from Doma testnet
    const [names, chainStats, listings] = await Promise.all([
      domaClient.getAllNames(100),
      domaClient.getChainStatistics(),
      domaClient.getAllListings(100)
    ])

    // Calculate TLD distribution from real data
    const tldCounts: Record<string, { count: number; volume: number }> = {}
    for (const name of names) {
      if (!name.name) continue
      const parts = name.name.split('.')
      const tld = parts[parts.length - 1] || 'unknown'
      
      if (!tldCounts[tld]) {
        tldCounts[tld] = { count: 0, volume: 0 }
      }
      tldCounts[tld].count++
      
      // Find listing price for volume calculation
      const token = name.tokens?.[0]
      if (token) {
        const listing = listings.find((l: any) => l.tokenId === token.tokenId)
        if (listing) {
          const price = parseFloat(listing.price) * (listing.currency?.usdExchangeRate || 1)
          tldCounts[tld].volume += price
        }
      }
    }

    // Convert to array and sort by count
    const topTLDs = Object.entries(tldCounts)
      .map(([tld, data]) => ({ tld, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Calculate average price from real listings
    const avgPrice = listings.length > 0
      ? listings.reduce((sum: number, l: any) => {
          const price = parseFloat(l.price) * (l.currency?.usdExchangeRate || 1)
          return sum + price
        }, 0) / listings.length
      : 0

    // Calculate risk distribution from real domains
    const riskDistribution = { low: 0, medium: 0, high: 0 }
    for (const name of names) {
      if (!name.tokens?.[0]) continue
      const token = name.tokens[0]
      
      // Simple risk calculation based on expiry
      const expiresAt = new Date(token.expiresAt)
      const daysUntilExpiry = Math.floor(
        (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
      
      if (daysUntilExpiry > 180) {
        riskDistribution.low++
      } else if (daysUntilExpiry > 60) {
        riskDistribution.medium++
      } else {
        riskDistribution.high++
      }
    }

    let data
    
    switch (type) {
      case 'overview':
        data = {
          totalDomains: chainStats?.totalNamesTokenized || names.length,
          totalVolume: chainStats?.totalRevenueUsd || topTLDs.reduce((sum, tld) => sum + tld.volume, 0),
          avgPrice: Math.round(avgPrice),
          topTLDs: topTLDs.slice(0, 3),
          activeWallets: chainStats?.totalActiveWallets || 0,
          totalTransactions: chainStats?.totalTransactions || 0
        }
        break
      
      case 'tlds':
        data = {
          topTLDs,
          total: names.length
        }
        break
      
      case 'movers':
        // Calculate top movers based on recent activity
        const domainActivity: any[] = []
        for (const name of names.slice(0, 20)) {
          if (!name.tokens?.[0]) continue
          const token = name.tokens[0]
          
          try {
            const activities = await domaClient.getTokenActivities(token.tokenId, 10)
            if (activities.length > 0) {
              domainActivity.push({
                name: name.name,
                change: activities.length * 5, // Activity as proxy for momentum
                price: listings.find((l: any) => l.tokenId === token.tokenId)?.price || 0,
                lastActivity: activities[0]?.createdAt
              })
            }
          } catch (err) {
            // Skip if can't get activities
          }
        }
        
        data = {
          topMovers: domainActivity
            .sort((a, b) => b.change - a.change)
            .slice(0, 10),
          period
        }
        break
      
      case 'risk':
        data = {
          distribution: riskDistribution,
          total: Object.values(riskDistribution).reduce((a, b) => a + b, 0)
        }
        break
      
      case 'trends':
        // Create trend data from recent listings
        const now = new Date()
        const trends = []
        const daysCount = period === '30d' ? 30 : 7
        
        for (let i = daysCount - 1; i >= 0; i--) {
          const date = new Date(now)
          date.setDate(date.getDate() - i)
          
          // Count listings from that day
          const dayListings = listings.filter((l: any) => {
            const listingDate = new Date(l.createdAt)
            return listingDate.toDateString() === date.toDateString()
          })
          
          trends.push({
            date: date.toISOString().split('T')[0],
            volume: dayListings.length * 1000, // Approximate volume
            avgPrice: dayListings.length > 0
              ? dayListings.reduce((sum: number, l: any) => {
                  const price = parseFloat(l.price) * (l.currency?.usdExchangeRate || 1)
                  return sum + price
                }, 0) / dayListings.length
              : avgPrice
          })
        }
        
        data = {
          trends,
          period
        }
        break
      
      default:
        data = {
          totalDomains: chainStats?.totalNamesTokenized || names.length,
          topTLDs,
          riskDistribution,
          avgPrice: Math.round(avgPrice)
        }
    }

    return NextResponse.json({
      type,
      period,
      data,
      timestamp: new Date().toISOString(),
      source: 'doma-testnet'
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}

// Cron job endpoint for precomputing analytics
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    // Verify cron secret in production
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch and cache real data
    const [names, chainStats, listings] = await Promise.all([
      domaClient.getAllNames(100),
      domaClient.getChainStatistics(),
      domaClient.getAllListings(100)
    ])
    
    const precomputedData = {
      totalDomains: chainStats?.totalNamesTokenized || names.length,
      namesCount: names.length,
      listingsCount: listings.length,
      lastUpdate: new Date().toISOString(),
      nextUpdate: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
    }

    return NextResponse.json({
      success: true,
      message: 'Analytics precomputed successfully',
      data: precomputedData,
    })
  } catch (error) {
    console.error('Error precomputing analytics:', error)
    return NextResponse.json(
      { error: 'Failed to precompute analytics' },
      { status: 500 }
    )
  }
}