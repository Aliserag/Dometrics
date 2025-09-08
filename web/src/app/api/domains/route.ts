import { NextRequest, NextResponse } from 'next/server'
import { ScoringEngine } from '@/lib/scoring'

const scoringEngine = new ScoringEngine()

// Mock domain data - replace with actual Doma Subgraph query
const mockDomains = [
  {
    id: '1',
    name: 'premium',
    tld: 'com',
    expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
    lockStatus: false,
    registrar: 'GoDaddy',
    registrarId: 1,
    owner: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    price: 5000,
    activity7d: 5,
    activity30d: 3,
    renewalCount: 2,
    offerCount: 3,
  },
  {
    id: '2',
    name: 'crypto',
    tld: 'xyz',
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    lockStatus: true,
    registrar: 'Namecheap',
    registrarId: 2,
    owner: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
    createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    price: 2500,
    activity7d: 8,
    activity30d: 4,
    renewalCount: 1,
    offerCount: 5,
  },
  {
    id: '3',
    name: 'defi',
    tld: 'com',
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    lockStatus: false,
    registrar: 'Cloudflare',
    registrarId: 3,
    owner: '0xdD2FD4581271e230360230F9337D5c0430Bf44C0',
    createdAt: new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString(),
    price: 10000,
    activity7d: 2,
    activity30d: 6,
    renewalCount: 3,
    offerCount: 2,
  },
]

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const tld = searchParams.get('tld')
    const sortBy = searchParams.get('sortBy') || 'price'
    const order = searchParams.get('order') || 'desc'

    // Filter domains by TLD if specified
    let domains = [...mockDomains]
    if (tld && tld !== 'all') {
      domains = domains.filter(d => d.tld === tld)
    }

    // Calculate scores for each domain
    const scoredDomains = domains.map(domain => ({
      ...domain,
      scores: scoringEngine.calculateScores(domain),
    }))

    // Sort domains
    scoredDomains.sort((a, b) => {
      let aValue, bValue
      
      switch (sortBy) {
        case 'price':
          aValue = a.price
          bValue = b.price
          break
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
        default:
          aValue = a.price
          bValue = b.price
      }

      return order === 'desc' ? bValue - aValue : aValue - bValue
    })

    // In production, this would cache to Upstash Redis
    // await redis.setex(`domains:${tld}:${sortBy}:${order}`, 300, JSON.stringify(scoredDomains))

    return NextResponse.json({
      domains: scoredDomains,
      total: scoredDomains.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching domains:', error)
    return NextResponse.json(
      { error: 'Failed to fetch domains' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { domainId } = body

    if (!domainId) {
      return NextResponse.json(
        { error: 'Domain ID is required' },
        { status: 400 }
      )
    }

    // Find domain
    const domain = mockDomains.find(d => d.id === domainId)
    if (!domain) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      )
    }

    // Calculate fresh scores
    const scores = scoringEngine.calculateScores(domain)

    // In production, cache to Upstash Redis
    // await redis.setex(`domain:${domainId}:scores`, 300, JSON.stringify(scores))

    return NextResponse.json({
      domainId,
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