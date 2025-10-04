/**
 * AI-powered domain valuation using DeepSeek API
 */

interface AIValuationResponse {
  currentValue: number
  projectedValue: number
  confidence: number
  keywordAnalysis: {
    keywords: string[]
    category: string
    brandability: number
    memorability: number
    commercialValue: number
  }
  factors: Array<{
    name: string
    value: number
    weight: number
    contribution: number
    description: string
  }>
  reasoning: string
}

export interface DomainAnalysis {
  summary: string
  investment_outlook: 'excellent' | 'good' | 'fair' | 'poor' | 'high-risk'
  composite_score: number // 0-100 overall domain quality score
  key_strengths: string[]
  key_risks: string[]
  recommendation: string
  confidence_level: number
}

export class AIValuationService {
  private apiKey: string
  private baseUrl = 'https://api.deepseek.com/v1/chat/completions'

  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY || ''
    if (!this.apiKey) {
      console.warn('DeepSeek API key not found - AI valuation will be disabled')
    }
  }

  async evaluateDomain(
    domainName: string, 
    tld: string, 
    marketData: {
      daysUntilExpiry: number
      offerCount: number
      activity30d: number
      registrar: string
      transferLock: boolean
    }
  ): Promise<AIValuationResponse> {
    if (!this.apiKey) {
      return this.getFallbackValuation(domainName, tld, marketData)
    }

    try {
      const prompt = this.buildValuationPrompt(domainName, tld, marketData)
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are an expert domain appraiser with deep knowledge of domain values, market trends, branding, SEO value, and commercial potential. Provide detailed, accurate domain valuations in JSON format.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 1500,
        }),
      })

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.statusText}`)
      }

      const data = await response.json()
      const aiResponse = data.choices[0]?.message?.content

      if (!aiResponse) {
        throw new Error('No response from AI')
      }

      // Parse the AI response (expecting JSON)
      const parsedResponse = this.parseAIResponse(aiResponse)
      return this.validateAndNormalizeResponse(parsedResponse, domainName, tld)

    } catch (error) {
      console.error('AI valuation error:', error)
      return this.getFallbackValuation(domainName, tld, marketData)
    }
  }

  async analyzeDomain(
    domainName: string,
    tld: string,
    scores: {
      risk: number
      rarity: number
      momentum: number
      currentValue: number
      projectedValue: number
    },
    marketData: {
      daysUntilExpiry: number
      offerCount: number
      activity30d: number
      registrar: string
      transferLock: boolean
    }
  ): Promise<DomainAnalysis> {
    if (!this.apiKey) {
      return this.getFallbackAnalysis(domainName, tld, scores, marketData)
    }

    try {
      const prompt = this.buildAnalysisPrompt(domainName, tld, scores, marketData)

      // Add 8 second timeout for faster fallback
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are a professional domain investment analyst. Provide concise, actionable analysis in JSON format. Do NOT calculate or mention ROI percentages - they will be provided to you.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3, // DeepSeek best practice: 0.3-0.4 for analytical tasks
          max_tokens: 600,
          response_format: { type: 'json_object' }, // DeepSeek JSON mode
          stream: false,
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.statusText}`)
      }

      const data = await response.json()
      const aiResponse = data.choices[0]?.message?.content

      if (!aiResponse) {
        throw new Error('No response from AI')
      }

      const parsedAnalysis = this.parseAnalysisResponse(aiResponse)
      return this.validateAnalysisResponse(parsedAnalysis, domainName, tld, scores, marketData)

    } catch (error) {
      console.error('AI analysis error:', error)
      return this.getFallbackAnalysis(domainName, tld, scores, marketData)
    }
  }

  private buildAnalysisPrompt(
    domainName: string,
    tld: string,
    scores: any,
    marketData: any
  ): string {
    // Build analysis context
    const context = {
      domain: `${domainName}.${tld}`,
      metrics: {
        risk_score: scores.risk,
        rarity_score: scores.rarity,
        momentum_score: scores.momentum,
        current_value_usd: scores.currentValue,
        projected_value_usd: scores.projectedValue,
        days_until_expiry: marketData.daysUntilExpiry,
        active_offers: marketData.offerCount,
        search_popularity: marketData.trendsPopularity || null,
        trend_direction: marketData.trendDirection || null
      }
    }

    return `Analyze this domain investment opportunity and return a JSON response.

DOMAIN: ${context.domain}

CALCULATED METRICS (DO NOT recalculate these):
- Risk Score: ${context.metrics.risk_score}/100
- Rarity Score: ${context.metrics.rarity_score}/100
- Momentum Score: ${context.metrics.momentum_score}/100
- Current Market Value: $${context.metrics.current_value_usd.toLocaleString()}
- 6-Month Projected Value: $${context.metrics.projected_value_usd.toLocaleString()}
- Days Until Expiry: ${context.metrics.days_until_expiry}
- Active Offers: ${context.metrics.active_offers}
${context.metrics.search_popularity ? `- Search Interest: ${context.metrics.search_popularity}/100 (${context.metrics.trend_direction})` : ''}

Return JSON with this exact structure:
{
  "summary": "Brief 1-2 sentence investment analysis focusing on market positioning and domain characteristics",
  "investment_outlook": "excellent|good|fair|poor|high-risk",
  "key_strengths": ["List 2-3 specific positive factors based on the metrics"],
  "key_risks": ["List 2-3 specific concerns or limitations"],
  "recommendation": "Actionable BUY/HOLD/SELL recommendation with specific price targets",
  "confidence_level": 75
}

Instructions:
- Assess quality based on the provided scores (higher rarity/momentum = better, lower risk = better)
- Do NOT mention or calculate ROI - this will be added separately
- Base outlook on score combination: excellent if low risk + high rarity, poor if high risk or low scores
- Make recommendation specific with price targets from the provided values
- Focus on qualitative insights about domain characteristics`
  }

  private parseAnalysisResponse(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      throw new Error('No JSON found in analysis response')
    } catch (error) {
      console.error('Failed to parse analysis response:', error)
      throw error
    }
  }

  /**
   * Calculate composite score from all domain metrics
   * Weighted combination of Risk (inverted), Rarity, Momentum, and Forecast
   */
  private calculateCompositeScore(scores: any): number {
    // Weights: Lower risk is better, higher is better for others
    const weights = {
      risk: 0.25,      // 25% - inverted (100 - risk)
      rarity: 0.30,    // 30% - higher is better
      momentum: 0.25,  // 25% - higher is better
      forecast: 0.20,  // 20% - higher is better
    }

    // Invert risk score (lower risk = higher quality)
    const invertedRisk = 100 - (scores.risk || 50)

    // Calculate weighted average
    const composite = (
      (invertedRisk * weights.risk) +
      ((scores.rarity || 50) * weights.rarity) +
      ((scores.momentum || 50) * weights.momentum) +
      ((scores.forecast || 50) * weights.forecast)
    )

    // Round to whole number and clamp to 0-100
    return Math.round(Math.min(100, Math.max(0, composite)))
  }

  private validateAnalysisResponse(
    response: any,
    domainName: string,
    tld: string,
    scores: any,
    marketData: any
  ): DomainAnalysis {
    // Calculate the CORRECT values from our scoring model
    const projectedGain = scores.projectedValue - scores.currentValue
    const correctROI = ((projectedGain / scores.currentValue) * 100).toFixed(1)

    console.log('🔍 Validating AI response - Correct ROI:', correctROI, '% (from $', scores.currentValue, 'to $', scores.projectedValue, ')')
    console.log('📝 Raw AI response summary:', response.summary)

    // Get base values from AI response or use defaults
    let aiSummary = response.summary || `This .${tld} domain represents a specific individual's name with very low risk but also extremely limited rarity and market momentum.`
    let recommendation = response.recommendation || this.getDefaultRecommendation(scores, correctROI)
    const keyRisks = Array.isArray(response.key_risks) ? response.key_risks : ['Standard market risks apply']
    const keyStrengths = Array.isArray(response.key_strengths) ? response.key_strengths : ['Basic domain characteristics']

    // CRITICAL FIX: The AI might ignore instructions and include a percentage anyway
    // Strip out the entire first sentence if it contains the domain name + "projects" + any percentage
    // This pattern matches: "domain.tld projects X% ..." or "domain.tld shows X% ..."
    const domainPrefixPattern = new RegExp(`^${domainName}\\.${tld}\\s+(projects|shows)\\s+[\\d\\.]+%[^.]*\\.\\s*`, 'i')
    aiSummary = aiSummary.replace(domainPrefixPattern, '')

    // Strip ONLY the AI's incorrect ROI mentions (before the first period)
    // This preserves percentages in the rest of the summary while removing AI's wrong ROI
    const firstSentence = aiSummary.split('.')[0]
    if (firstSentence && /-?\d+\.?\d*%/.test(firstSentence)) {
      // If first sentence contains a percentage, likely an AI-generated ROI - remove it
      aiSummary = aiSummary.substring(firstSentence.length + 1).trim()
    }

    // Now BUILD the summary with correct ROI at the start
    const summary = `${domainName}.${tld} projects ${correctROI}% 6-month ROI. ${aiSummary.trim()}`

    console.log('✅ Final summary with correct ROI:', summary.substring(0, 150))

    // Ensure recommendation is actionable with price targets
    if (!recommendation.includes('$') || recommendation.split(' ').length < 4) {
      console.log('⚠️ Recommendation too vague, using default')
      recommendation = this.getDefaultRecommendation(scores, correctROI)
    }

    // Calculate composite score
    const compositeScore = this.calculateCompositeScore(scores)

    const validated = {
      summary,
      investment_outlook: response.investment_outlook || this.determineOutlook(scores, Number(correctROI)),
      composite_score: compositeScore,
      key_strengths: keyStrengths.filter((s: string) => s && s.length > 0),
      key_risks: keyRisks.filter((r: string) => r && r.length > 0),
      recommendation,
      confidence_level: Math.min(95, Math.max(50, response.confidence_level || 70))
    }

    console.log('✅ Validated analysis:', {
      summary: validated.summary.substring(0, 100) + '...',
      recommendation: validated.recommendation
    })

    return validated
  }

  private getDefaultRecommendation(scores: any, roi: string): string {
    const roiNum = Number(roi)
    const currentVal = scores.currentValue
    const projectedVal = scores.projectedValue

    if (roiNum >= 15 && scores.risk < 50) {
      return `BUY - Strong ${roi}% upside potential. Target price: $${projectedVal.toLocaleString()}`
    } else if (roiNum >= 5 && scores.risk < 60) {
      return `HOLD - Moderate ${roi}% growth expected. Watch for entry below $${currentVal.toLocaleString()}`
    } else if (roiNum < 0 || scores.risk > 70) {
      return `SELL - Risk exceeds potential. Exit at or above $${currentVal.toLocaleString()} while possible`
    } else {
      return `HOLD - Limited ${roi}% upside. Monitor market, target $${projectedVal.toLocaleString()}`
    }
  }

  private determineOutlook(scores: any, roi: number): DomainAnalysis['investment_outlook'] {
    if (roi >= 15 && scores.risk < 40) return 'excellent'
    if (roi >= 8 && scores.risk < 55) return 'good'
    if (scores.risk > 70 || roi < -5) return 'high-risk'
    if (roi < 3) return 'poor'
    return 'fair'
  }

  getFallbackAnalysis(
    domainName: string,
    tld: string,
    scores: any,
    marketData: any
  ): DomainAnalysis {
    const strengths: string[] = []
    const risks: string[] = []

    // Calculate projected ROI from our forecasting model
    const projectedGain = scores.projectedValue - scores.currentValue
    const projectedROI = ((projectedGain / scores.currentValue) * 100).toFixed(1)
    const roiNum = Number(projectedROI)

    // Determine outlook using new helper method
    const outlook = this.determineOutlook(scores, roiNum)

    // Build summary based on outlook
    let summary = ''
    if (outlook === 'excellent') {
      summary = `${domainName}.${tld} projects ${projectedROI}% 6-month ROI with excellent fundamentals. Low risk and high rarity create strong investment opportunity.`
    } else if (outlook === 'good') {
      summary = `${domainName}.${tld} projects ${projectedROI}% 6-month ROI with solid value characteristics and manageable risk profile.`
    } else if (outlook === 'high-risk') {
      summary = `${domainName}.${tld} projects ${projectedROI}% 6-month ROI but carries significant risk factors that may impact realization.`
    } else if (outlook === 'poor') {
      summary = `${domainName}.${tld} projects limited ${projectedROI}% 6-month ROI with challenging market conditions.`
    } else {
      summary = `${domainName}.${tld} projects ${projectedROI}% 6-month ROI with moderate investment characteristics.`
    }

    // Add strengths
    if (domainName.length <= 6) strengths.push('Short, memorable domain name')
    if (scores.rarity > 60) strengths.push('Above-average rarity score')
    if (scores.momentum > 60) strengths.push('Strong market momentum')
    if (tld === 'com') strengths.push('Premium .com extension')
    if (marketData.offerCount > 3) strengths.push(`Active market interest (${marketData.offerCount} offers)`)
    if (marketData.trendsPopularity && marketData.trendsPopularity > 60) {
      strengths.push(`High search popularity (${marketData.trendsPopularity}/100)`)
    }

    // Add risks
    if (marketData.daysUntilExpiry < 90) risks.push(`Approaching expiration (${marketData.daysUntilExpiry} days remaining)`)
    if (scores.risk > 60) risks.push('High risk score requires careful monitoring')
    if (marketData.transferLock) risks.push('Transfer restrictions currently in place')
    if (marketData.activity30d < 3) risks.push('Limited recent market activity')
    if (marketData.trendsPopularity && marketData.trendsPopularity < 30) {
      risks.push('Low search interest may limit demand')
    }

    // Calculate composite score
    const compositeScore = this.calculateCompositeScore(scores)

    // Get recommendation using helper method
    const recommendation = this.getDefaultRecommendation(scores, projectedROI)

    return {
      summary,
      investment_outlook: outlook,
      composite_score: compositeScore,
      key_strengths: strengths.length > 0 ? strengths.slice(0, 4) : ['Basic domain characteristics'],
      key_risks: risks.length > 0 ? risks.slice(0, 4) : ['Standard market risks apply'],
      recommendation,
      confidence_level: 65
    }
  }

  private buildValuationPrompt(
    domainName: string, 
    tld: string, 
    marketData: any
  ): string {
    return `
Please provide a comprehensive valuation for the domain "${domainName}.${tld}".

Domain Details:
- Full domain: ${domainName}.${tld}
- Name part: ${domainName}
- TLD: .${tld}
- Days until expiry: ${marketData.daysUntilExpiry}
- Recent offers: ${marketData.offerCount}
- 30-day activity: ${marketData.activity30d}
- Registrar: ${marketData.registrar}
- Transfer locked: ${marketData.transferLock}

Please analyze and provide a JSON response with the following structure:
{
  "currentValue": number (estimated current USD value),
  "projectedValue": number (6-month projected USD value),
  "confidence": number (0-100, confidence in valuation),
  "keywordAnalysis": {
    "keywords": ["array", "of", "relevant", "keywords"],
    "category": "string (e.g., tech, finance, generic, brandable, etc.)",
    "brandability": number (0-100),
    "memorability": number (0-100),
    "commercialValue": number (0-100)
  },
  "factors": [
    {
      "name": "Length Premium",
      "value": ${domainName.length},
      "weight": 0.25,
      "contribution": number,
      "description": "Impact of domain length on value"
    },
    {
      "name": "Keyword Value",
      "value": number,
      "weight": 0.35,
      "contribution": number,
      "description": "Commercial value of keywords/brandability"
    },
    {
      "name": "TLD Premium",
      "value": number,
      "weight": 0.20,
      "contribution": number,
      "description": "Value impact of .${tld} extension"
    },
    {
      "name": "Market Factors",
      "value": number,
      "weight": 0.20,
      "contribution": number,
      "description": "Market activity and demand signals"
    }
  ],
  "reasoning": "Brief explanation of the valuation rationale"
}

Consider these factors in your analysis:
1. Domain length (shorter is typically more valuable)
2. Keyword relevance and commercial potential
3. Brandability and memorability
4. TLD value (.com premium, niche TLD relevance)
5. Market trends and comparable sales
6. SEO potential and search volume
7. Industry relevance and commercial use cases
8. Linguistic factors (easy to pronounce/spell)
9. Current market activity and interest
10. Risk factors (expiry, transfer restrictions)

Base your valuation on real-world domain market knowledge and comparable sales data.
`
  }

  private parseAIResponse(response: string): any {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      throw new Error('No JSON found in response')
    } catch (error) {
      console.error('Failed to parse AI response:', error)
      throw error
    }
  }

  private validateAndNormalizeResponse(
    response: any, 
    domainName: string, 
    tld: string
  ): AIValuationResponse {
    // Ensure required fields exist with sensible defaults
    return {
      currentValue: Math.max(100, response.currentValue || 1000),
      projectedValue: Math.max(100, response.projectedValue || response.currentValue * 1.1),
      confidence: Math.min(95, Math.max(50, response.confidence || 75)),
      keywordAnalysis: {
        keywords: response.keywordAnalysis?.keywords || [domainName],
        category: response.keywordAnalysis?.category || 'generic',
        brandability: Math.min(100, Math.max(0, response.keywordAnalysis?.brandability || 50)),
        memorability: Math.min(100, Math.max(0, response.keywordAnalysis?.memorability || 50)),
        commercialValue: Math.min(100, Math.max(0, response.keywordAnalysis?.commercialValue || 50))
      },
      factors: response.factors || this.getDefaultFactors(domainName, tld),
      reasoning: response.reasoning || 'AI-powered valuation based on domain characteristics and market factors.'
    }
  }

  private getFallbackValuation(
    domainName: string, 
    tld: string, 
    marketData: any
  ): AIValuationResponse {
    // Fallback to algorithm-based valuation when AI is unavailable
    const baseValue = 100
    const lengthMultiplier = domainName.length <= 4 ? 10 : domainName.length <= 7 ? 3 : 1
    const tldMultiplier = tld === 'com' ? 2 : tld === 'ai' ? 1.5 : 1
    
    const currentValue = Math.max(100, baseValue * lengthMultiplier * tldMultiplier)
    const projectedValue = currentValue * (1 + (marketData.offerCount || 0) * 0.1)

    return {
      currentValue,
      projectedValue,
      confidence: 60,
      keywordAnalysis: {
        keywords: [domainName],
        category: 'generic',
        brandability: domainName.length <= 7 ? 70 : 40,
        memorability: domainName.length <= 6 ? 80 : 50,
        commercialValue: tld === 'com' ? 70 : 50
      },
      factors: this.getDefaultFactors(domainName, tld),
      reasoning: 'Algorithmic fallback valuation based on basic domain characteristics.'
    }
  }

  private getDefaultFactors(domainName: string, tld: string) {
    return [
      {
        name: 'Length Premium',
        value: domainName.length,
        weight: 0.25,
        contribution: domainName.length <= 4 ? 500 : domainName.length <= 7 ? 200 : 0,
        description: `${domainName.length} character domain name`
      },
      {
        name: 'TLD Value',
        value: tld === 'com' ? 100 : tld === 'ai' ? 75 : 50,
        weight: 0.25,
        contribution: tld === 'com' ? 300 : tld === 'ai' ? 150 : 0,
        description: `.${tld} extension value`
      }
    ]
  }
}

// Create singleton instance
export const aiValuationService = new AIValuationService()