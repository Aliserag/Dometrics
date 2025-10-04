/**
 * Google Trends integration for domain popularity scoring
 * Uses google-trends-api to fetch search interest data
 */

import googleTrends from 'google-trends-api'

export interface TrendData {
  keyword: string
  averageInterest: number // 0-100
  trend: 'rising' | 'stable' | 'declining'
  peakInterest: number
  currentInterest: number
}

export class GoogleTrendsService {
  /**
   * Fetch interest over time for a keyword (past 12 months)
   */
  async getInterestOverTime(keyword: string): Promise<TrendData | null> {
    try {
      // Fetch trend data for the past 12 months
      const result = await googleTrends.interestOverTime({
        keyword,
        startTime: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        endTime: new Date(),
      })

      const data = JSON.parse(result)

      if (!data.default?.timelineData || data.default.timelineData.length === 0) {
        return null
      }

      const timelineData = data.default.timelineData

      // Extract interest values
      const interests = timelineData.map((point: any) => point.value[0])

      // Calculate metrics
      const averageInterest = Math.round(
        interests.reduce((sum: number, val: number) => sum + val, 0) / interests.length
      )

      const peakInterest = Math.max(...interests)
      const currentInterest = interests[interests.length - 1] || 0

      // Determine trend by comparing recent vs older data
      const recentAvg = interests.slice(-4).reduce((a: number, b: number) => a + b, 0) / 4
      const olderAvg = interests.slice(0, 4).reduce((a: number, b: number) => a + b, 0) / 4

      let trend: 'rising' | 'stable' | 'declining'
      if (recentAvg > olderAvg * 1.2) {
        trend = 'rising'
      } else if (recentAvg < olderAvg * 0.8) {
        trend = 'declining'
      } else {
        trend = 'stable'
      }

      return {
        keyword,
        averageInterest,
        trend,
        peakInterest,
        currentInterest,
      }
    } catch (error) {
      console.error('Error fetching Google Trends data:', error)
      return null
    }
  }

  /**
   * Get popularity score from trend data (0-100)
   */
  calculatePopularityScore(trendData: TrendData | null): number {
    if (!trendData) return 50 // Neutral score if no data

    let score = trendData.averageInterest

    // Boost for rising trends
    if (trendData.trend === 'rising') {
      score += 10
    } else if (trendData.trend === 'declining') {
      score -= 10
    }

    // Boost for high current interest
    if (trendData.currentInterest > 75) {
      score += 5
    }

    // Clamp to 0-100
    return Math.max(0, Math.min(100, score))
  }

  /**
   * Fetch and score domain name popularity
   */
  async getDomainPopularity(domainName: string): Promise<{
    score: number
    trendData: TrendData | null
  }> {
    const trendData = await this.getInterestOverTime(domainName)
    const score = this.calculatePopularityScore(trendData)

    return { score, trendData }
  }
}

export const googleTrendsService = new GoogleTrendsService()
