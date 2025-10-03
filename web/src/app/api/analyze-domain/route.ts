import { NextRequest, NextResponse } from 'next/server'
import { AIValuationService } from '@/lib/ai-valuation'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { domainName, tld, scores, marketData } = body

    if (!domainName || !tld || !scores || !marketData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const aiService = new AIValuationService()
    const analysis = await aiService.analyzeDomain(
      domainName,
      tld,
      scores,
      marketData
    )

    return NextResponse.json(analysis)
  } catch (error) {
    console.error('Error in analyze-domain API:', error)
    return NextResponse.json(
      { error: 'Failed to analyze domain' },
      { status: 500 }
    )
  }
}
