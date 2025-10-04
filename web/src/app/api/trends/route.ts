import { NextRequest, NextResponse } from 'next/server'
import { googleTrendsService } from '@/lib/google-trends'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const keyword = searchParams.get('keyword')

    if (!keyword) {
      return NextResponse.json(
        { error: 'Keyword parameter is required' },
        { status: 400 }
      )
    }

    const result = await googleTrendsService.getDomainPopularity(keyword)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in trends API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trend data', score: 50, trendData: null },
      { status: 500 }
    )
  }
}
