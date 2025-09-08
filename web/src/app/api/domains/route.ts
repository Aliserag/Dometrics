import { NextRequest, NextResponse } from 'next/server'
import { ScoringEngine } from '@/lib/scoring'
import { domaClient } from '@/lib/doma-client'

const scoringEngine = new ScoringEngine()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 100)
    const tld = searchParams.get('tld')
    const minRisk = searchParams.get('minRisk') ? parseInt(searchParams.get('minRisk')!) : undefined
    const maxRisk = searchParams.get('maxRisk') ? parseInt(searchParams.get('maxRisk')!) : undefined
    const sortBy = searchParams.get('sortBy') || 'risk'
    const order = searchParams.get('order') || 'desc'

    // Fetch real domains from Doma testnet
    const names = await domaClient.getAllNames(100)
    const transformedDomains = []

    for (const name of names) {
      if (!name.tokens || name.tokens.length === 0) continue
      
      for (const token of name.tokens) {
        const parts = name.name.split('.')
        const namePart = parts[0]
        const domainTld = parts.slice(1).join('.') || 'com'
        
        // Apply TLD filter
        if (tld && tld !== 'all' && domainTld !== tld) continue
        
        const daysUntilExpiry = Math.floor(
          (new Date(token.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
        
        const isPopularTLD = ['com', 'ai', 'io', 'xyz'].includes(domainTld)
        const isShortName = namePart.length < 8
        
        const baseActivity = isPopularTLD ? 15 : 5
        const activity7d = Math.floor(Math.random() * 20) + baseActivity
        const activity30d = Math.floor(Math.random() * 50) + activity7d * 2
        
        const scores = scoringEngine.calculateScores({
          name: namePart,
          tld: domainTld,
          expiresAt: new Date(token.expiresAt),
          lockStatus: name.transferLock || false,
          registrarId: name.registrar?.ianaId ? parseInt(name.registrar.ianaId) : 1,
          renewalCount: daysUntilExpiry > 365 ? Math.floor(Math.random() * 3) + 1 : 0,
          offerCount: isShortName ? Math.floor(Math.random() * 15) + 2 : Math.floor(Math.random() * 5),
          activity7d,
          activity30d,
        })
        
        // Apply risk filters
        if (minRisk !== undefined && scores.risk < minRisk) continue
        if (maxRisk !== undefined && scores.risk > maxRisk) continue
        
        transformedDomains.push({
          id: token.tokenId,
          name: name.name,
          tokenId: token.tokenId,
          tokenAddress: token.tokenAddress,
          owner: token.ownerAddress,
          expiresAt: token.expiresAt,
          scores: {
            risk: scores.risk,
            rarity: scores.rarity,
            momentum: scores.momentum,
            forecast: scores.forecast,
            explainers: scores.explainers
          },
          daysUntilExpiry,
          registrar: name.registrar?.name || 'Unknown',
          transferLock: name.transferLock || false,
          price: Math.floor(Math.random() * 10000) + 1000,
          explorerUrl: token.explorerUrl,
          activity: {
            '7d': activity7d,
            '30d': activity30d
          }
        })
      }
    }
    
    // Sort domains
    transformedDomains.sort((a, b) => {
      let aValue, bValue
      
      switch (sortBy) {
        case 'risk':
          aValue = a.scores.risk
          bValue = b.scores.risk
          break
        case 'rarity':
          aValue = a.scores.rarity
          bValue = b.scores.rarity
          break
        case 'momentum':
          aValue = a.scores.momentum
          bValue = b.scores.momentum
          break
        case 'forecast':
          aValue = a.scores.forecast
          bValue = b.scores.forecast
          break
        case 'price':
          aValue = a.price
          bValue = b.price
          break
        default:
          aValue = a.scores.risk
          bValue = b.scores.risk
      }

      return order === 'desc' ? bValue - aValue : aValue - bValue
    })

    const limitedDomains = transformedDomains.slice(0, limit)

    return NextResponse.json({
      data: limitedDomains,
      total: transformedDomains.length,
      page: 1,
      limit: limit,
      filters: {
        tld: tld || null,
        minRisk: minRisk || null,
        maxRisk: maxRisk || null,
        sortBy,
        order
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch domains', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tokenId } = body

    if (!tokenId) {
      return NextResponse.json(
        { error: 'Token ID is required' },
        { status: 400 }
      )
    }

    // Fetch real domains from Doma testnet
    const names = await domaClient.getAllNames(100)
    let foundDomain = null

    for (const name of names) {
      if (!name.tokens || name.tokens.length === 0) continue
      
      for (const token of name.tokens) {
        if (token.tokenId === tokenId) {
          const parts = name.name.split('.')
          const namePart = parts[0]
          const domainTld = parts.slice(1).join('.') || 'com'
          
          foundDomain = {
            name: namePart,
            tld: domainTld,
            expiresAt: new Date(token.expiresAt),
            lockStatus: name.transferLock || false,
            registrarId: name.registrar?.ianaId ? parseInt(name.registrar.ianaId) : 1,
            renewalCount: Math.floor(Math.random() * 3),
            offerCount: Math.floor(Math.random() * 10),
            activity7d: Math.floor(Math.random() * 20) + 5,
            activity30d: Math.floor(Math.random() * 50) + 15,
          }
          break
        }
      }
      if (foundDomain) break
    }

    if (!foundDomain) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      )
    }

    // Calculate fresh scores
    const scores = scoringEngine.calculateScores(foundDomain)

    return NextResponse.json({
      tokenId,
      scores,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error calculating scores:', error)
    return NextResponse.json(
      { error: 'Failed to calculate scores' },
      { status: 500 }
    )
  }
}